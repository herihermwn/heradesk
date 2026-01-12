// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  event: string;
  data: T;
  timestamp: number;
  requestId?: string;
}

// ============================================
// CUSTOMER EVENTS (Anonymous)
// ============================================

// Client → Server
export const CUSTOMER_EVENTS = {
  START_CHAT: "customer:start_chat",
  SEND_MESSAGE: "customer:send_message",
  TYPING: "customer:typing",
  END_CHAT: "customer:end_chat",
  RATING: "customer:rating",
} as const;

// Server → Client
export const CUSTOMER_SERVER_EVENTS = {
  CHAT_ASSIGNED: "chat:assigned",
  MESSAGE: "chat:message",
  CS_TYPING: "chat:cs_typing",
  ENDED: "chat:ended",
  QUEUE_POSITION: "chat:queue_position",
  ERROR: "system:error",
} as const;

// ============================================
// CS EVENTS
// ============================================

// Client → Server
export const CS_EVENTS = {
  SET_STATUS: "cs:set_status",
  ACCEPT_CHAT: "cs:accept_chat",
  SEND_MESSAGE: "cs:send_message",
  TYPING: "cs:typing",
  RESOLVE_CHAT: "cs:resolve_chat",
  TRANSFER_CHAT: "cs:transfer_chat",
} as const;

// Server → Client
export const CS_SERVER_EVENTS = {
  NEW_CHAT: "chat:new",
  NEW_ASSIGNED: "chat:new_assigned",
  MESSAGE: "chat:message",
  CUSTOMER_TYPING: "chat:customer_typing",
  CUSTOMER_LEFT: "chat:customer_left",
  QUEUE_UPDATE: "queue:update",
  NEW_QUEUE_CHAT: "queue:new_chat",
  NOTIFICATION: "system:notification",
  RESOLVED: "chat:resolved",
  TRANSFERRED_IN: "chat:transferred_in",
  TRANSFERRED_OUT: "chat:transferred_out",
} as const;

// ============================================
// ADMIN EVENTS
// ============================================

// Client → Server
export const ADMIN_EVENTS = {
  SUBSCRIBE_STATS: "admin:subscribe_stats",
  FORCE_ASSIGN: "admin:force_assign",
} as const;

// Server → Client
export const ADMIN_SERVER_EVENTS = {
  STATS_UPDATE: "stats:update",
  CS_STATUS_CHANGED: "cs:status_changed",
  CHAT_CREATED: "chat:created",
  CHAT_RESOLVED: "chat:resolved",
  NEW_ACTIVITY: "activity:new",
} as const;

// ============================================
// EVENT DATA TYPES
// ============================================

// Customer Events Data
export interface CustomerStartChatData {
  customerName?: string;
  customerEmail?: string;
  sourceUrl?: string;
}

export interface CustomerSendMessageData {
  sessionId: string;
  content: string;
  messageType?: "text" | "image" | "file";
}

export interface CustomerTypingData {
  sessionId: string;
  isTyping: boolean;
}

export interface CustomerEndChatData {
  sessionId: string;
}

export interface CustomerRatingData {
  sessionId: string;
  rating: number;
  feedback?: string;
}

// CS Events Data
export interface CsSetStatusData {
  status: "online" | "offline" | "busy";
}

export interface CsAcceptChatData {
  sessionId: string;
}

export interface CsSendMessageData {
  sessionId: string;
  content: string;
  messageType?: "text" | "image" | "file";
}

export interface CsTypingData {
  sessionId: string;
  isTyping: boolean;
}

export interface CsResolveChatData {
  sessionId: string;
}

export interface CsTransferChatData {
  sessionId: string;
  toCsId: string;
}

// Admin Events Data
export interface AdminForceAssignData {
  sessionId: string;
  csId: string;
}

// Server Response Data
export interface ChatAssignedData {
  sessionId: string;
  cs: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ChatMessageData {
  sessionId: string;
  message: {
    id: string;
    content: string;
    senderType: "customer" | "cs" | "system";
    senderId?: string;
    messageType: "text" | "image" | "file" | "system";
    createdAt: Date;
  };
}

export interface TypingIndicatorData {
  sessionId: string;
  isTyping: boolean;
}

export interface QueuePositionData {
  sessionId: string;
  position: number;
}

export interface QueueUpdateData {
  action: "assigned" | "customer_left" | "new_chat";
  sessionId: string;
  customerName?: string;
}

export interface StatsUpdateData {
  activeChats: number;
  waitingChats: number;
  todayChats: number;
  onlineCS: number;
}

export interface CsStatusChangedData {
  csId: string;
  csName: string;
  status: "online" | "offline" | "busy";
}

export interface ErrorData {
  code: string;
  message: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a WebSocket message
 */
export function createMessage<T>(
  event: string,
  data: T,
  requestId?: string
): WebSocketMessage<T> {
  return {
    event,
    data,
    timestamp: Date.now(),
    requestId,
  };
}

/**
 * Parse a WebSocket message
 */
export function parseMessage(raw: string | Buffer): WebSocketMessage | null {
  try {
    const str = typeof raw === "string" ? raw : raw.toString();
    return JSON.parse(str) as WebSocketMessage;
  } catch {
    return null;
  }
}

/**
 * Create an error message
 */
export function createErrorMessage(
  code: string,
  message: string,
  requestId?: string
): WebSocketMessage<ErrorData> {
  return createMessage("system:error", { code, message }, requestId);
}
