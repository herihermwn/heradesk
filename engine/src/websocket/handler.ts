import type { ServerWebSocket } from "bun";
import { parseMessage, CUSTOMER_EVENTS, CS_EVENTS, ADMIN_EVENTS } from "./events";
import {
  subscribeToRooms,
  unsubscribeFromRooms,
  trackConnection,
  untrackConnection,
} from "./rooms";

// Import customer handlers
import {
  handleCustomerStartChat,
  handleCustomerSendMessage,
  handleCustomerTyping,
  handleCustomerEndChat,
  handleCustomerRating,
  handleCustomerDisconnect,
  handleCustomerReconnect,
} from "./messages/customer";

// Import CS handlers
import {
  handleCsSetStatus,
  handleCsAcceptChat,
  handleCsSendMessage,
  handleCsTyping,
  handleCsResolveChat,
  handleCsTransferChat,
  handleCsDisconnect,
  handleCsConnect,
} from "./messages/cs";

// ============================================
// TYPES
// ============================================

export type WebSocketData = {
  role: "customer" | "cs" | "admin";
  userId?: string;
  sessionId?: string;
  customerToken?: string;
  connectionId?: string;
};

// ============================================
// WEBSOCKET HANDLER
// ============================================

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    const { role, userId, sessionId, customerToken } = ws.data;

    console.log(`[WebSocket] Connection opened: ${role}`);

    // Track connection
    const connectionId = trackConnection(ws);
    ws.data.connectionId = connectionId;

    // Subscribe to appropriate rooms
    subscribeToRooms(ws);

    // Role-specific initialization
    if (role === "customer" && customerToken) {
      // Customer reconnecting with existing token
      handleCustomerReconnect(ws, customerToken);
    } else if (role === "cs" && userId) {
      // CS connected - send initial data
      handleCsConnect(ws);
    } else if (role === "admin") {
      // Admin connected - could send initial stats
      console.log(`[WebSocket] Admin connected`);
    }
  },

  message(ws: ServerWebSocket<WebSocketData>, raw: string | Buffer) {
    const message = parseMessage(raw);

    if (!message) {
      console.error("[WebSocket] Failed to parse message");
      return;
    }

    console.log(`[WebSocket] Message received:`, message.event);

    const { role } = ws.data;

    // Route message to appropriate handler based on role and event
    switch (role) {
      case "customer":
        handleCustomerEvent(ws, message.event, message.data);
        break;
      case "cs":
        handleCsEvent(ws, message.event, message.data);
        break;
      case "admin":
        handleAdminEvent(ws, message.event, message.data);
        break;
      default:
        console.log(`[WebSocket] Unknown role: ${role}`);
    }
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    const { role, connectionId } = ws.data;
    console.log(`[WebSocket] Connection closed: ${role}`);

    // Unsubscribe from rooms
    unsubscribeFromRooms(ws);

    // Untrack connection
    if (connectionId) {
      untrackConnection(connectionId);
    }

    // Role-specific cleanup
    if (role === "customer") {
      handleCustomerDisconnect(ws);
    } else if (role === "cs") {
      handleCsDisconnect(ws);
    }
  },

  error(ws: ServerWebSocket<WebSocketData>, error: Error) {
    console.error("[WebSocket] Error:", error);
  },
};

// ============================================
// EVENT ROUTERS
// ============================================

function handleCustomerEvent(
  ws: ServerWebSocket<WebSocketData>,
  event: string,
  data: any
) {
  switch (event) {
    case CUSTOMER_EVENTS.START_CHAT:
      handleCustomerStartChat(ws, data);
      break;
    case CUSTOMER_EVENTS.SEND_MESSAGE:
      handleCustomerSendMessage(ws, data);
      break;
    case CUSTOMER_EVENTS.TYPING:
      handleCustomerTyping(ws, data);
      break;
    case CUSTOMER_EVENTS.END_CHAT:
      handleCustomerEndChat(ws, data);
      break;
    case CUSTOMER_EVENTS.RATING:
      handleCustomerRating(ws, data);
      break;
    default:
      console.log(`[WebSocket] Unknown customer event: ${event}`);
  }
}

function handleCsEvent(
  ws: ServerWebSocket<WebSocketData>,
  event: string,
  data: any
) {
  switch (event) {
    case CS_EVENTS.SET_STATUS:
      handleCsSetStatus(ws, data);
      break;
    case CS_EVENTS.ACCEPT_CHAT:
      handleCsAcceptChat(ws, data);
      break;
    case CS_EVENTS.SEND_MESSAGE:
      handleCsSendMessage(ws, data);
      break;
    case CS_EVENTS.TYPING:
      handleCsTyping(ws, data);
      break;
    case CS_EVENTS.RESOLVE_CHAT:
      handleCsResolveChat(ws, data);
      break;
    case CS_EVENTS.TRANSFER_CHAT:
      handleCsTransferChat(ws, data);
      break;
    default:
      console.log(`[WebSocket] Unknown CS event: ${event}`);
  }
}

function handleAdminEvent(
  ws: ServerWebSocket<WebSocketData>,
  event: string,
  data: any
) {
  switch (event) {
    case ADMIN_EVENTS.SUBSCRIBE_STATS:
      // Already subscribed on connect
      console.log(`[WebSocket] Admin subscribed to stats`);
      break;
    case ADMIN_EVENTS.FORCE_ASSIGN:
      // TODO: Implement force assign
      console.log(`[WebSocket] Admin force assign:`, data);
      break;
    default:
      console.log(`[WebSocket] Unknown admin event: ${event}`);
  }
}
