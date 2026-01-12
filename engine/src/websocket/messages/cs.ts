import type { ServerWebSocket } from "bun";
import type { WebSocketData } from "../handler";
import {
  createMessage,
  createErrorMessage,
  type CsSetStatusData,
  type CsAcceptChatData,
  type CsSendMessageData,
  type CsTypingData,
  type CsResolveChatData,
  type CsTransferChatData,
  CS_SERVER_EVENTS,
} from "../events";
import { subscribeCsToSession, unsubscribeCsFromSession } from "../rooms";
import {
  sendMessage,
  assignChat,
  resolveChat,
  transferChat,
  getSessionById,
  getActiveChatsForCS,
} from "../../services/ChatService";
import { updateCsStatus, getCsStatus } from "../../services/UserService";
import { processQueue, getQueue } from "../../services/QueueService";
import {
  notifyTyping,
  notifyNewMessage,
  notifyChatAssigned,
  notifyChatResolved,
  notifyChatTransferred,
  notifyCsStatusChanged,
} from "../../services/NotificationService";
import { prisma } from "../../config/database";
import type { CsState } from "@prisma/client";

// ============================================
// CS MESSAGE HANDLERS
// ============================================

/**
 * Handle cs:set_status event
 * CS sets their availability status
 */
export async function handleCsSetStatus(
  ws: ServerWebSocket<WebSocketData>,
  data: CsSetStatusData
) {
  try {
    const { status } = data;
    const userId = ws.data.userId;

    if (!userId) {
      ws.send(
        JSON.stringify(createErrorMessage("UNAUTHORIZED", "Tidak terautentikasi"))
      );
      return;
    }

    if (!["online", "offline", "busy"].includes(status)) {
      ws.send(
        JSON.stringify(createErrorMessage("INVALID_STATUS", "Status tidak valid"))
      );
      return;
    }

    // Update status
    const csStatus = await updateCsStatus(userId, status as CsState);

    // Get CS name for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Notify others about status change
    notifyCsStatusChanged(userId, user?.name || "CS", status);

    // If going online, try to process queue
    if (status === "online") {
      await processQueue();
    }

    // Confirm to CS
    ws.send(
      JSON.stringify(
        createMessage("status:updated", {
          status: csStatus.status,
          maxChats: csStatus.maxChats,
          currentChats: csStatus.currentChats,
        })
      )
    );

    // If going online, send current queue
    if (status === "online") {
      const queue = await getQueue();
      ws.send(
        JSON.stringify(
          createMessage(CS_SERVER_EVENTS.QUEUE_UPDATE, {
            queue: queue.map((item) => ({
              sessionId: item.sessionId,
              customerName: item.customerName,
              position: item.position,
              waitTime: item.waitTime,
              lastMessage: item.lastMessage,
            })),
          })
        )
      );
    }
  } catch (error) {
    console.error("[WebSocket] CS set status error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Terjadi kesalahan server"))
    );
  }
}

/**
 * Handle cs:accept_chat event
 * CS accepts a chat from queue
 */
export async function handleCsAcceptChat(
  ws: ServerWebSocket<WebSocketData>,
  data: CsAcceptChatData
) {
  try {
    const { sessionId } = data;
    const userId = ws.data.userId;

    if (!userId) {
      ws.send(
        JSON.stringify(createErrorMessage("UNAUTHORIZED", "Tidak terautentikasi"))
      );
      return;
    }

    // Check CS capacity
    const csStatus = await getCsStatus(userId);
    if (!csStatus || csStatus.status !== "online") {
      ws.send(
        JSON.stringify(
          createErrorMessage("NOT_ONLINE", "Anda harus online untuk menerima chat")
        )
      );
      return;
    }

    if (csStatus.currentChats >= csStatus.maxChats) {
      ws.send(
        JSON.stringify(
          createErrorMessage("AT_CAPACITY", "Anda sudah mencapai batas chat maksimal")
        )
      );
      return;
    }

    // Get session and check status
    const session = await getSessionById(sessionId);
    if (!session) {
      ws.send(
        JSON.stringify(
          createErrorMessage("SESSION_NOT_FOUND", "Chat tidak ditemukan")
        )
      );
      return;
    }

    if (session.status !== "waiting") {
      ws.send(
        JSON.stringify(
          createErrorMessage("ALREADY_ASSIGNED", "Chat sudah ditangani CS lain")
        )
      );
      return;
    }

    // Assign chat
    const assigned = await assignChat(sessionId, userId);

    // Subscribe CS to session topic
    subscribeCsToSession(ws, sessionId);

    // Get CS info for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true },
    });

    // Notify customer
    notifyChatAssigned(sessionId, userId, user?.name || "CS", user?.avatarUrl);

    // Confirm to CS
    ws.send(
      JSON.stringify(
        createMessage("chat:accepted", {
          sessionId,
          customerName: session.customerName,
          customerEmail: session.customerEmail,
          messages: session.messages,
          createdAt: session.createdAt,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] CS accept chat error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Terjadi kesalahan server"))
    );
  }
}

/**
 * Handle cs:send_message event
 * CS sends a message
 */
export async function handleCsSendMessage(
  ws: ServerWebSocket<WebSocketData>,
  data: CsSendMessageData
) {
  try {
    const { sessionId, content, messageType = "text" } = data;
    const userId = ws.data.userId;

    if (!userId) {
      ws.send(
        JSON.stringify(createErrorMessage("UNAUTHORIZED", "Tidak terautentikasi"))
      );
      return;
    }

    if (!content || content.trim() === "") {
      ws.send(
        JSON.stringify(createErrorMessage("EMPTY_MESSAGE", "Pesan tidak boleh kosong"))
      );
      return;
    }

    // Verify CS is assigned to this chat
    const session = await getSessionById(sessionId);
    if (!session || session.assignedCsId !== userId) {
      ws.send(
        JSON.stringify(
          createErrorMessage("NOT_ASSIGNED", "Anda tidak memiliki akses ke chat ini")
        )
      );
      return;
    }

    // Send message
    const result = await sendMessage(
      sessionId,
      "cs",
      content.trim(),
      userId,
      messageType
    );

    if (!result.success) {
      ws.send(
        JSON.stringify(
          createErrorMessage("SEND_FAILED", result.message || "Gagal mengirim pesan")
        )
      );
      return;
    }

    // Create message object
    const message = {
      id: result.messageId!,
      content: content.trim(),
      senderType: "cs" as const,
      senderId: userId,
      messageType,
      createdAt: new Date(),
    };

    // Notify customer via topic
    notifyNewMessage(sessionId, message);

    // Confirm to CS
    ws.send(
      JSON.stringify(
        createMessage("message:sent", {
          messageId: result.messageId,
          sessionId,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] CS send message error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Terjadi kesalahan server"))
    );
  }
}

/**
 * Handle cs:typing event
 * CS typing indicator
 */
export async function handleCsTyping(
  ws: ServerWebSocket<WebSocketData>,
  data: CsTypingData
) {
  try {
    const { sessionId, isTyping } = data;
    const userId = ws.data.userId;

    if (!userId || !sessionId) {
      return; // Silently ignore
    }

    // Notify customer about typing
    notifyTyping(sessionId, "cs", isTyping);
  } catch (error) {
    console.error("[WebSocket] CS typing error:", error);
  }
}

/**
 * Handle cs:resolve_chat event
 * CS resolves/ends a chat
 */
export async function handleCsResolveChat(
  ws: ServerWebSocket<WebSocketData>,
  data: CsResolveChatData
) {
  try {
    const { sessionId } = data;
    const userId = ws.data.userId;

    if (!userId) {
      ws.send(
        JSON.stringify(createErrorMessage("UNAUTHORIZED", "Tidak terautentikasi"))
      );
      return;
    }

    // Resolve chat
    const result = await resolveChat(sessionId, userId);

    if (!result) {
      ws.send(
        JSON.stringify(
          createErrorMessage(
            "RESOLVE_FAILED",
            "Gagal menyelesaikan chat atau bukan milik Anda"
          )
        )
      );
      return;
    }

    // Unsubscribe from session topic
    unsubscribeCsFromSession(ws, sessionId);

    // Notify customer
    notifyChatResolved(sessionId, userId);

    // Confirm to CS
    ws.send(
      JSON.stringify(
        createMessage(CS_SERVER_EVENTS.RESOLVED, {
          sessionId,
        })
      )
    );

    // Try to process queue (CS now has capacity)
    await processQueue();
  } catch (error) {
    console.error("[WebSocket] CS resolve chat error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Terjadi kesalahan server"))
    );
  }
}

/**
 * Handle cs:transfer_chat event
 * CS transfers chat to another CS
 */
export async function handleCsTransferChat(
  ws: ServerWebSocket<WebSocketData>,
  data: CsTransferChatData
) {
  try {
    const { sessionId, toCsId } = data;
    const userId = ws.data.userId;

    if (!userId) {
      ws.send(
        JSON.stringify(createErrorMessage("UNAUTHORIZED", "Tidak terautentikasi"))
      );
      return;
    }

    // Check target CS availability
    const targetCsStatus = await getCsStatus(toCsId);
    if (!targetCsStatus || targetCsStatus.status !== "online") {
      ws.send(
        JSON.stringify(
          createErrorMessage("TARGET_NOT_ONLINE", "CS tujuan tidak online")
        )
      );
      return;
    }

    if (targetCsStatus.currentChats >= targetCsStatus.maxChats) {
      ws.send(
        JSON.stringify(
          createErrorMessage("TARGET_AT_CAPACITY", "CS tujuan sudah penuh")
        )
      );
      return;
    }

    // Transfer chat
    const result = await transferChat(sessionId, userId, toCsId);

    if (!result) {
      ws.send(
        JSON.stringify(
          createErrorMessage(
            "TRANSFER_FAILED",
            "Gagal transfer chat atau bukan milik Anda"
          )
        )
      );
      return;
    }

    // Unsubscribe from session topic
    unsubscribeCsFromSession(ws, sessionId);

    // Get target CS name
    const targetCs = await prisma.user.findUnique({
      where: { id: toCsId },
      select: { name: true },
    });

    // Notify parties
    notifyChatTransferred(sessionId, userId, toCsId, targetCs?.name || "CS");

    // Confirm to CS
    ws.send(
      JSON.stringify(
        createMessage(CS_SERVER_EVENTS.TRANSFERRED_OUT, {
          sessionId,
          toCsId,
          toCsName: targetCs?.name,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] CS transfer chat error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Terjadi kesalahan server"))
    );
  }
}

/**
 * Handle CS disconnect
 */
export async function handleCsDisconnect(ws: ServerWebSocket<WebSocketData>) {
  try {
    const userId = ws.data.userId;

    if (!userId) {
      return;
    }

    // Set CS status to offline
    await updateCsStatus(userId, "offline");

    // Get CS name for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Notify about status change
    notifyCsStatusChanged(userId, user?.name || "CS", "offline");
  } catch (error) {
    console.error("[WebSocket] CS disconnect error:", error);
  }
}

/**
 * Handle CS connect - send initial data
 */
export async function handleCsConnect(ws: ServerWebSocket<WebSocketData>) {
  try {
    const userId = ws.data.userId;

    if (!userId) {
      return;
    }

    // Get CS status
    const status = await getCsStatus(userId);

    // Get active chats
    const activeChats = await getActiveChatsForCS(userId);

    // Subscribe to all active chat sessions
    for (const chat of activeChats) {
      subscribeCsToSession(ws, chat.id);
    }

    // Get queue
    const queue = await getQueue();

    // Send initial data
    ws.send(
      JSON.stringify(
        createMessage("cs:connected", {
          status: status
            ? {
                status: status.status,
                maxChats: status.maxChats,
                currentChats: status.currentChats,
              }
            : null,
          activeChats: activeChats.map((chat) => ({
            sessionId: chat.id,
            customerName: chat.customerName,
            customerEmail: chat.customerEmail,
            assignedAt: chat.assignedAt,
            lastMessage: chat.messages[0]
              ? {
                  content: chat.messages[0].content,
                  senderType: chat.messages[0].senderType,
                  createdAt: chat.messages[0].createdAt,
                }
              : null,
          })),
          queue: queue.map((item) => ({
            sessionId: item.sessionId,
            customerName: item.customerName,
            position: item.position,
            waitTime: item.waitTime,
            lastMessage: item.lastMessage,
          })),
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] CS connect error:", error);
  }
}
