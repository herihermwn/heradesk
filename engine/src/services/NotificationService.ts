import type { ServerWebSocket } from "bun";
import type { WebSocketData } from "../websocket/handler";

// ============================================
// TYPES
// ============================================

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: number;
  requestId?: string;
}

// Server type with WebSocketData
type BunServer = ReturnType<typeof Bun.serve<WebSocketData>>;

// Store reference to the server for publishing
let serverInstance: BunServer | null = null;

// ============================================
// SERVER SETUP
// ============================================

/**
 * Set the server instance for publishing messages
 */
export function setServer(server: BunServer) {
  serverInstance = server;
}

/**
 * Get the server instance
 */
export function getServer(): BunServer | null {
  return serverInstance;
}

// ============================================
// PUBLISH FUNCTIONS
// ============================================

/**
 * Publish message to a topic
 */
export function publishToTopic(topic: string, event: string, data: any) {
  if (!serverInstance) {
    console.error("[NotificationService] Server not initialized");
    return false;
  }

  const message: WebSocketMessage = {
    event,
    data,
    timestamp: Date.now(),
  };

  serverInstance.publish(topic, JSON.stringify(message));
  return true;
}

/**
 * Send message to a specific WebSocket connection
 */
export function sendToClient(
  ws: ServerWebSocket<WebSocketData>,
  event: string,
  data: any,
  requestId?: string
) {
  const message: WebSocketMessage = {
    event,
    data,
    timestamp: Date.now(),
    requestId,
  };

  ws.send(JSON.stringify(message));
}

// ============================================
// NOTIFICATION HELPERS
// ============================================

/**
 * Notify customer about chat events
 */
export function notifyCustomer(sessionId: string, event: string, data: any) {
  return publishToTopic(`session:${sessionId}`, event, data);
}

/**
 * Notify CS about events
 */
export function notifyCS(userId: string, event: string, data: any) {
  return publishToTopic(`cs:${userId}`, event, data);
}

/**
 * Notify all CS about queue updates
 */
export function notifyQueue(event: string, data: any) {
  return publishToTopic("queue", event, data);
}

/**
 * Notify admins about stats updates
 */
export function notifyAdmins(event: string, data: any) {
  return publishToTopic("admin:stats", event, data);
}

/**
 * Broadcast to all connected clients
 */
export function broadcast(event: string, data: any) {
  return publishToTopic("broadcast", event, data);
}

// ============================================
// CHAT NOTIFICATIONS
// ============================================

/**
 * Notify when chat is assigned to CS
 */
export function notifyChatAssigned(
  sessionId: string,
  csId: string,
  csName: string,
  csAvatar?: string | null
) {
  // Note: CS subscription is handled by the caller (handleCsAcceptChat or processQueue)
  // to avoid duplicate subscriptions

  // Notify customer
  notifyCustomer(sessionId, "chat:assigned", {
    sessionId,
    cs: {
      id: csId,
      name: csName,
      avatarUrl: csAvatar,
    },
  });

  // Notify CS
  notifyCS(csId, "chat:new_assigned", {
    sessionId,
  });

  // Update queue for all CS
  notifyQueue("queue:update", {
    action: "assigned",
    sessionId,
  });
}

/**
 * Notify when new message is sent
 */
export function notifyNewMessage(
  sessionId: string,
  message: {
    id: string;
    content: string;
    senderType: string;
    senderId?: string;
    messageType: string;
    createdAt: Date;
  }
) {
  publishToTopic(`session:${sessionId}`, "chat:message", {
    sessionId,
    message,
  });
}

/**
 * Notify typing indicator
 */
export function notifyTyping(
  sessionId: string,
  senderType: "customer" | "cs",
  isTyping: boolean
) {
  const event = senderType === "customer" ? "chat:customer_typing" : "chat:cs_typing";
  publishToTopic(`session:${sessionId}`, event, {
    sessionId,
    isTyping,
  });
}

/**
 * Notify when chat is resolved
 */
export function notifyChatResolved(sessionId: string, csId: string) {
  // Notify customer
  notifyCustomer(sessionId, "chat:ended", {
    sessionId,
    reason: "resolved",
  });

  // Notify CS
  notifyCS(csId, "chat:resolved", {
    sessionId,
  });

  // Update admin stats
  notifyAdmins("stats:chat_resolved", {
    sessionId,
    csId,
  });
}

/**
 * Notify when chat is transferred
 */
export function notifyChatTransferred(
  sessionId: string,
  fromCsId: string,
  toCsId: string,
  toCsName: string
) {
  // Notify customer
  notifyCustomer(sessionId, "chat:transferred", {
    sessionId,
    newCs: {
      id: toCsId,
      name: toCsName,
    },
  });

  // Notify old CS
  notifyCS(fromCsId, "chat:transferred_out", {
    sessionId,
    toCsId,
  });

  // Notify new CS
  notifyCS(toCsId, "chat:transferred_in", {
    sessionId,
    fromCsId,
  });
}

/**
 * Notify when customer leaves
 */
export function notifyCustomerLeft(sessionId: string, csId?: string) {
  if (csId) {
    notifyCS(csId, "chat:customer_left", {
      sessionId,
    });
  }

  notifyQueue("queue:update", {
    action: "customer_left",
    sessionId,
  });
}

/**
 * Notify new chat in queue
 */
export function notifyNewChatInQueue(sessionId: string, customerName?: string | null) {
  notifyQueue("queue:new_chat", {
    sessionId,
    customerName,
  });

  notifyAdmins("stats:new_chat", {
    sessionId,
  });
}

/**
 * Notify queue position update to customer
 */
export function notifyQueuePosition(sessionId: string, position: number) {
  notifyCustomer(sessionId, "chat:queue_position", {
    sessionId,
    position,
  });
}

// ============================================
// CS STATUS NOTIFICATIONS
// ============================================

/**
 * Notify CS status change
 */
export function notifyCsStatusChanged(
  csId: string,
  csName: string,
  status: string
) {
  notifyQueue("cs:status_changed", {
    csId,
    csName,
    status,
  });

  notifyAdmins("cs:status_changed", {
    csId,
    csName,
    status,
  });
}

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

/**
 * Send real-time stats update to admins
 */
export function notifyStatsUpdate(stats: {
  activeChats: number;
  waitingChats: number;
  todayChats: number;
  onlineCS: number;
}) {
  notifyAdmins("stats:update", stats);
}

/**
 * Notify admin about activity
 */
export function notifyActivity(activity: {
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
}) {
  notifyAdmins("activity:new", activity);
}
