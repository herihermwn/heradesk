import { validateToken } from "../services/AuthService";
import {
  getActiveChatsForCS,
  getChatHistoryForCS,
  getSessionById,
  assignChat,
  resolveChat,
  transferChat,
} from "../services/ChatService";
import {
  getCsStatus,
  updateCsStatus,
  getCsStats,
  getOnlineCS,
} from "../services/UserService";
import { getQueue, processQueue } from "../services/QueueService";
import {
  notifyChatAssigned,
  notifyChatResolved,
  notifyChatTransferred,
  notifyCsStatusChanged,
} from "../services/NotificationService";
import { prisma } from "../config/database";
import type { CsState } from "@prisma/client";

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await validateToken(token);

  if (!payload || payload.role !== "cs") {
    return null;
  }

  return payload;
}

// ============================================
// CS STATUS ROUTES
// ============================================

/**
 * GET /api/cs/status
 * Get CS's own status
 */
export async function handleGetCsStatus(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const status = await getCsStatus(user.userId);

    if (!status) {
      return Response.json(
        { success: false, message: "Status not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        state: status.status,
        maxChats: status.maxChats,
        activeChats: status.currentChats,
        lastActiveAt: status.lastActiveAt,
      },
    });
  } catch (error) {
    console.error("[CS] Get status error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cs/status
 * Update CS status (online/offline/busy)
 */
export async function handleUpdateCsStatus(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["online", "offline", "busy"].includes(status)) {
      return Response.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    const csStatus = await updateCsStatus(user.userId, status as CsState);

    if (!csStatus) {
      return Response.json(
        { success: false, message: "Failed to update status" },
        { status: 500 }
      );
    }

    // Notify about status change
    notifyCsStatusChanged(user.userId, user.username, status);

    // If going online, try to process queue
    if (status === "online") {
      await processQueue();
    }

    return Response.json({
      success: true,
      message: "Status updated successfully",
      data: {
        state: csStatus.status,
        maxChats: csStatus.maxChats,
        activeChats: csStatus.currentChats,
      },
    });
  } catch (error) {
    console.error("[CS] Update status error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

// ============================================
// CS CHAT ROUTES
// ============================================

/**
 * GET /api/cs/chats
 * Get CS's active chats
 */
export async function handleGetCsChats(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const chats = await getActiveChatsForCS(user.userId);

    return Response.json({
      success: true,
      data: chats.map((chat) => ({
        id: chat.id,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        status: chat.status,
        createdAt: chat.createdAt?.toISOString?.() || chat.createdAt,
        assignedAt: chat.assignedAt?.toISOString?.() || chat.assignedAt,
        lastMessage: chat.messages[0]
          ? {
              content: chat.messages[0].content,
              senderType: chat.messages[0].senderType,
              createdAt: chat.messages[0].createdAt?.toISOString?.() || chat.messages[0].createdAt,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[CS] Get chats error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cs/chats/:id
 * Get chat detail with messages
 */
export async function handleGetChatDetail(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chatId = pathParts[pathParts.length - 1];

    if (!chatId) {
      return Response.json(
        { success: false, message: "Invalid chat ID" },
        { status: 400 }
      );
    }

    const session = await getSessionById(chatId);

    if (!session) {
      return Response.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    // Check if CS is assigned to this chat or if it's in queue (waiting)
    if (session.assignedCsId !== user.userId && session.status !== "waiting") {
      return Response.json(
        { success: false, message: "You don't have access to this chat" },
        { status: 403 }
      );
    }

    return Response.json({
      success: true,
      data: {
        session: {
          id: session.id,
          customerName: session.customerName,
          customerEmail: session.customerEmail,
          status: session.status,
          createdAt: session.createdAt?.toISOString(),
          assignedAt: session.assignedAt?.toISOString(),
          resolvedAt: session.resolvedAt?.toISOString(),
          rating: session.rating,
          feedback: session.feedback,
          messages: session.messages?.map((m) => ({
            ...m,
            createdAt: m.createdAt?.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    console.error("[CS] Get chat detail error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cs/history
 * Get CS's chat history
 */
export async function handleGetCsHistory(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const result = await getChatHistoryForCS(user.userId, page, limit);

    return Response.json({
      success: true,
      ...result,
      chats: result.chats.map((chat) => ({
        id: chat.id,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        status: chat.status,
        createdAt: chat.createdAt,
        resolvedAt: chat.resolvedAt,
        rating: chat.rating,
        _count: chat._count,
        lastMessage: chat.messages[0]
          ? {
              content: chat.messages[0].content,
              createdAt: chat.messages[0].createdAt,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[CS] Get history error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cs/queue
 * Get waiting queue
 */
export async function handleGetCsQueue(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const queue = await getQueue();

    return Response.json({
      success: true,
      data: queue.map((item) => ({
        id: item.sessionId,
        sessionId: item.sessionId,
        customerName: item.customerName,
        position: item.position,
        waitTime: item.waitTime,
        createdAt: item.createdAt?.toISOString?.() || item.createdAt,
        lastMessage: item.lastMessage,
      })),
    });
  } catch (error) {
    console.error("[CS] Get queue error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cs/chats/:id/accept
 * Accept a chat from queue
 */
export async function handleAcceptChat(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chatId = pathParts[pathParts.length - 2]; // /api/cs/chats/:id/accept

    if (!chatId) {
      return Response.json(
        { success: false, message: "Invalid chat ID" },
        { status: 400 }
      );
    }

    // Check CS capacity
    const csStatus = await getCsStatus(user.userId);
    if (
      !csStatus ||
      csStatus.status !== "online" ||
      csStatus.currentChats >= csStatus.maxChats
    ) {
      return Response.json(
        {
          success: false,
          message: "You cannot accept chats at this time",
        },
        { status: 400 }
      );
    }

    // Get session and check status
    const session = await getSessionById(chatId);
    if (!session || session.status !== "waiting") {
      return Response.json(
        { success: false, message: "Chat not available" },
        { status: 400 }
      );
    }

    // Assign chat
    const assigned = await assignChat(chatId, user.userId);

    // Get CS info for notification
    const csUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true, avatarUrl: true },
    });

    // Notify customer and others
    notifyChatAssigned(
      chatId,
      user.userId,
      csUser?.name || user.username,
      csUser?.avatarUrl
    );

    return Response.json({
      success: true,
      message: "Chat accepted successfully",
      chat: {
        id: assigned.id,
        customerName: assigned.customerName,
        status: assigned.status,
        assignedAt: assigned.assignedAt,
      },
    });
  } catch (error) {
    console.error("[CS] Accept chat error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cs/chats/:id/resolve
 * Resolve/end a chat
 */
export async function handleResolveChat(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chatId = pathParts[pathParts.length - 2];

    if (!chatId) {
      return Response.json(
        { success: false, message: "Invalid chat ID" },
        { status: 400 }
      );
    }

    const result = await resolveChat(chatId, user.userId);

    if (!result) {
      return Response.json(
        {
          success: false,
          message: "Chat not found or not assigned to you",
        },
        { status: 400 }
      );
    }

    // Notify customer
    notifyChatResolved(chatId, user.userId);

    return Response.json({
      success: true,
      message: "Chat resolved successfully",
    });
  } catch (error) {
    console.error("[CS] Resolve chat error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cs/chats/:id/transfer
 * Transfer chat to another CS
 */
export async function handleTransferChat(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const chatId = pathParts[pathParts.length - 2];

    const body = await req.json();
    const { toCsId } = body;

    if (!chatId || !toCsId) {
      return Response.json(
        { success: false, message: "Incomplete data" },
        { status: 400 }
      );
    }

    // Check target CS availability
    const targetCs = await getCsStatus(toCsId);
    if (
      !targetCs ||
      targetCs.status !== "online" ||
      targetCs.currentChats >= targetCs.maxChats
    ) {
      return Response.json(
        { success: false, message: "Target CS not available" },
        { status: 400 }
      );
    }

    const result = await transferChat(chatId, user.userId, toCsId);

    if (!result) {
      return Response.json(
        {
          success: false,
          message: "Chat not found or not assigned to you",
        },
        { status: 400 }
      );
    }

    // Get target CS name
    const targetCsUser = await prisma.user.findUnique({
      where: { id: toCsId },
      select: { name: true },
    });

    // Notify
    notifyChatTransferred(
      chatId,
      user.userId,
      toCsId,
      targetCsUser?.name || "CS"
    );

    return Response.json({
      success: true,
      message: "Chat transferred successfully",
    });
  } catch (error) {
    console.error("[CS] Transfer chat error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cs/online
 * Get list of online CS (for transfer)
 */
export async function handleGetOnlineCS(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const onlineCS = await getOnlineCS();

    // Filter out current user
    const filtered = onlineCS.filter((cs) => cs.id !== user.userId);

    return Response.json({
      success: true,
      data: filtered.map((cs) => ({
        id: cs.id,
        name: cs.name,
        avatarUrl: cs.avatarUrl,
        status: cs.csStatus?.status,
        currentChats: cs.csStatus?.currentChats,
        maxChats: cs.csStatus?.maxChats,
        available:
          cs.csStatus &&
          cs.csStatus.status === "online" &&
          cs.csStatus.currentChats < cs.csStatus.maxChats,
      })),
    });
  } catch (error) {
    console.error("[CS] Get online CS error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cs/stats
 * Get CS's own statistics
 */
export async function handleGetCsStats(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const stats = await getCsStats(user.userId);

    return Response.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[CS] Get stats error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

// ============================================
// CANNED RESPONSES ROUTES
// ============================================

/**
 * GET /api/cs/canned-responses
 * Get canned responses (personal + global)
 */
export async function handleGetCannedResponses(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const responses = await prisma.cannedResponse.findMany({
      where: {
        OR: [{ createdBy: user.userId }, { isGlobal: true }],
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    return Response.json({
      success: true,
      data: responses.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        shortcut: r.shortcut,
        category: r.category,
        isGlobal: r.isGlobal,
        isOwn: r.createdBy === user.userId,
      })),
    });
  } catch (error) {
    console.error("[CS] Get canned responses error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cs/canned-responses
 * Create a new canned response
 */
export async function handleCreateCannedResponse(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, content, shortcut, category } = body;

    if (!title || !content) {
      return Response.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    const response = await prisma.cannedResponse.create({
      data: {
        title,
        content,
        shortcut,
        category,
        createdBy: user.userId,
        isGlobal: false,
      },
    });

    return Response.json({
      success: true,
      message: "Canned response created successfully",
      response: {
        id: response.id,
        title: response.title,
        content: response.content,
        shortcut: response.shortcut,
        category: response.category,
      },
    });
  } catch (error) {
    console.error("[CS] Create canned response error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cs/canned-responses/:id
 * Delete a canned response (own only)
 */
export async function handleDeleteCannedResponse(req: Request): Promise<Response> {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const responseId = pathParts[pathParts.length - 1];

    if (!responseId) {
      return Response.json(
        { success: false, message: "Invalid ID" },
        { status: 400 }
      );
    }

    // Check ownership
    const response = await prisma.cannedResponse.findUnique({
      where: { id: responseId },
    });

    if (!response || response.createdBy !== user.userId) {
      return Response.json(
        { success: false, message: "Response not found" },
        { status: 404 }
      );
    }

    await prisma.cannedResponse.delete({
      where: { id: responseId },
    });

    return Response.json({
      success: true,
      message: "Canned response deleted successfully",
    });
  } catch (error) {
    console.error("[CS] Delete canned response error:", error);
    return Response.json(
      { success: false, message: "Server error occurred" },
      { status: 500 }
    );
  }
}
