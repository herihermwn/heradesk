import type { ServerWebSocket } from "bun";
import type { WebSocketData } from "../handler";
import {
  createMessage,
  createErrorMessage,
  type CustomerSendMessageData,
  type CustomerTypingData,
  type CustomerEndChatData,
  type CustomerRatingData,
  CUSTOMER_SERVER_EVENTS,
} from "../events";
import { subscribeCustomerToSession, TOPICS } from "../rooms";
import {
  initChat,
  sendMessage,
  endChat,
  submitRating,
  getSessionByToken,
} from "../../services/ChatService";
import { autoAssignChat, getQueuePosition } from "../../services/QueueService";
import {
  notifyNewChatInQueue,
  notifyTyping,
  notifyNewMessage,
  notifyCustomerLeft,
} from "../../services/NotificationService";

// ============================================
// CUSTOMER MESSAGE HANDLERS
// ============================================

/**
 * Handle customer:start_chat event
 * Start a new chat session
 */
export async function handleCustomerStartChat(
  ws: ServerWebSocket<WebSocketData>,
  data: {
    customerName?: string;
    customerEmail?: string;
    sourceUrl?: string;
  }
) {
  try {
    const { customerName, customerEmail, sourceUrl } = data;

    // Initialize chat session
    const result = await initChat(customerName, customerEmail, sourceUrl);

    if (!result.success || !result.sessionId || !result.customerToken) {
      ws.send(
        JSON.stringify(
          createErrorMessage("INIT_FAILED", result.message || "Failed to start chat")
        )
      );
      return;
    }

    // Update ws.data
    ws.data.sessionId = result.sessionId;
    ws.data.customerToken = result.customerToken;

    // Subscribe to session topic
    subscribeCustomerToSession(ws, result.sessionId);

    // Notify CS about new chat
    notifyNewChatInQueue(result.sessionId, customerName);

    // Try auto-assign
    const assigned = await autoAssignChat(result.sessionId);

    if (assigned) {
      // Chat was assigned, notify customer
      ws.send(
        JSON.stringify(
          createMessage(CUSTOMER_SERVER_EVENTS.CHAT_ASSIGNED, {
            sessionId: result.sessionId,
            cs: assigned.cs,
          })
        )
      );
    } else {
      // Chat is in queue, send position
      const position = await getQueuePosition(result.sessionId);
      ws.send(
        JSON.stringify(
          createMessage(CUSTOMER_SERVER_EVENTS.QUEUE_POSITION, {
            sessionId: result.sessionId,
            position: position || 1,
          })
        )
      );
    }

    // Send success response
    ws.send(
      JSON.stringify(
        createMessage("chat:started", {
          sessionId: result.sessionId,
          customerToken: result.customerToken,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] Customer start chat error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Server error occurred"))
    );
  }
}

/**
 * Handle customer:send_message event
 * Send a message from customer
 */
export async function handleCustomerSendMessage(
  ws: ServerWebSocket<WebSocketData>,
  data: CustomerSendMessageData
) {
  try {
    const { sessionId, content, messageType = "text" } = data;

    // Validate session
    if (!sessionId || sessionId !== ws.data.sessionId) {
      ws.send(
        JSON.stringify(createErrorMessage("INVALID_SESSION", "Invalid session"))
      );
      return;
    }

    if (!content || content.trim() === "") {
      ws.send(
        JSON.stringify(createErrorMessage("EMPTY_MESSAGE", "Message cannot be empty"))
      );
      return;
    }

    // Send message
    const result = await sendMessage(
      sessionId,
      "customer",
      content.trim(),
      undefined,
      messageType
    );

    if (!result.success) {
      ws.send(
        JSON.stringify(
          createErrorMessage("SEND_FAILED", result.message || "Failed to send message")
        )
      );
      return;
    }

    // Get session to check if CS is assigned
    const session = await getSessionByToken(ws.data.customerToken!);

    // Create message object
    const message = {
      id: result.messageId!,
      content: content.trim(),
      senderType: "customer" as const,
      senderId: undefined,
      messageType,
      createdAt: new Date(),
    };

    // Notify CS via topic (if assigned)
    if (session?.assignedCsId) {
      notifyNewMessage(sessionId, message);
    }

    // Confirm to customer
    ws.send(
      JSON.stringify(
        createMessage("message:sent", {
          messageId: result.messageId,
          sessionId,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] Customer send message error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Server error occurred"))
    );
  }
}

/**
 * Handle customer:typing event
 * Customer typing indicator
 */
export async function handleCustomerTyping(
  ws: ServerWebSocket<WebSocketData>,
  data: CustomerTypingData
) {
  try {
    const { sessionId, isTyping } = data;

    // Validate session
    if (!sessionId || sessionId !== ws.data.sessionId) {
      return; // Silently ignore invalid typing events
    }

    // Notify CS about typing
    notifyTyping(sessionId, "customer", isTyping);
  } catch (error) {
    console.error("[WebSocket] Customer typing error:", error);
  }
}

/**
 * Handle customer:end_chat event
 * Customer ends the chat
 */
export async function handleCustomerEndChat(
  ws: ServerWebSocket<WebSocketData>,
  data: CustomerEndChatData
) {
  try {
    const { sessionId } = data;

    // Validate session
    if (!sessionId || sessionId !== ws.data.sessionId) {
      ws.send(
        JSON.stringify(createErrorMessage("INVALID_SESSION", "Invalid session"))
      );
      return;
    }

    // Get session to find assigned CS
    const session = await getSessionByToken(ws.data.customerToken!);
    const csId = session?.assignedCsId;

    // End the chat
    const result = await endChat(sessionId);

    if (!result) {
      ws.send(
        JSON.stringify(createErrorMessage("END_FAILED", "Failed to end chat"))
      );
      return;
    }

    // Notify CS
    if (csId) {
      notifyCustomerLeft(sessionId, csId);
    }

    // Confirm to customer
    ws.send(
      JSON.stringify(
        createMessage(CUSTOMER_SERVER_EVENTS.ENDED, {
          sessionId,
          reason: "customer_left",
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] Customer end chat error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Server error occurred"))
    );
  }
}

/**
 * Handle customer:rating event
 * Customer submits rating after chat
 */
export async function handleCustomerRating(
  ws: ServerWebSocket<WebSocketData>,
  data: CustomerRatingData
) {
  try {
    const { sessionId, rating, feedback } = data;

    // Validate
    if (!ws.data.customerToken) {
      ws.send(
        JSON.stringify(createErrorMessage("INVALID_SESSION", "Invalid session"))
      );
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      ws.send(
        JSON.stringify(
          createErrorMessage("INVALID_RATING", "Rating must be between 1-5")
        )
      );
      return;
    }

    // Submit rating
    const result = await submitRating(ws.data.customerToken, rating, feedback);

    if (!result) {
      ws.send(
        JSON.stringify(
          createErrorMessage("RATING_FAILED", "Failed to save rating")
        )
      );
      return;
    }

    // Confirm
    ws.send(
      JSON.stringify(
        createMessage("rating:submitted", {
          sessionId,
          rating,
        })
      )
    );
  } catch (error) {
    console.error("[WebSocket] Customer rating error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Server error occurred"))
    );
  }
}

/**
 * Handle customer disconnect
 */
export async function handleCustomerDisconnect(
  ws: ServerWebSocket<WebSocketData>
) {
  try {
    const { sessionId, customerToken } = ws.data;

    if (!sessionId || !customerToken) {
      return;
    }

    // Get session to check status
    const session = await getSessionByToken(customerToken);

    if (session && (session.status === "waiting" || session.status === "active")) {
      // Notify CS if assigned
      if (session.assignedCsId) {
        notifyCustomerLeft(sessionId, session.assignedCsId);
      }

      // Note: We don't auto-end the chat on disconnect
      // Customer might reconnect. Let idle timeout handle it.
    }
  } catch (error) {
    console.error("[WebSocket] Customer disconnect error:", error);
  }
}

/**
 * Handle customer reconnect with existing token
 */
export async function handleCustomerReconnect(
  ws: ServerWebSocket<WebSocketData>,
  customerToken: string
) {
  try {
    const session = await getSessionByToken(customerToken);

    if (!session) {
      ws.send(
        JSON.stringify(
          createErrorMessage("SESSION_NOT_FOUND", "Session not found")
        )
      );
      return false;
    }

    // Update ws.data
    ws.data.sessionId = session.id;
    ws.data.customerToken = customerToken;

    // Subscribe to session topic
    subscribeCustomerToSession(ws, session.id);

    // Send session info
    ws.send(
      JSON.stringify(
        createMessage("session:restored", {
          sessionId: session.id,
          status: session.status,
          assignedCs: session.assignedCs,
          messages: session.messages,
        })
      )
    );

    return true;
  } catch (error) {
    console.error("[WebSocket] Customer reconnect error:", error);
    ws.send(
      JSON.stringify(createErrorMessage("SERVER_ERROR", "Server error occurred"))
    );
    return false;
  }
}
