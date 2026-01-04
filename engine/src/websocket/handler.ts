import type { ServerWebSocket } from "bun";

export type WebSocketData = {
  role: "customer" | "cs" | "admin";
  userId?: string;
  sessionId?: string;
  customerToken?: string;
};

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    const { role, userId, sessionId } = ws.data;

    console.log(`[WebSocket] Connection opened: ${role}`);

    if (role === "customer" && sessionId) {
      ws.subscribe(`session:${sessionId}`);
    } else if (role === "cs" && userId) {
      ws.subscribe(`cs:${userId}`);
      ws.subscribe("queue");
    } else if (role === "admin") {
      ws.subscribe("admin:stats");
      ws.subscribe("queue");
    }
  },

  message(ws: ServerWebSocket<WebSocketData>, raw: string | Buffer) {
    try {
      const message = JSON.parse(raw.toString());
      console.log(`[WebSocket] Message received:`, message);

      switch (message.event) {
        case "customer:send_message":
          handleCustomerMessage(ws, message.data);
          break;
        case "cs:send_message":
          handleCsMessage(ws, message.data);
          break;
        case "cs:set_status":
          handleCsStatus(ws, message.data);
          break;
        default:
          console.log(`[WebSocket] Unknown event: ${message.event}`);
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    const { role, sessionId, userId } = ws.data;
    console.log(`[WebSocket] Connection closed: ${role}`);

    if (role === "customer" && sessionId) {
      ws.publish(
        `session:${sessionId}`,
        JSON.stringify({
          event: "chat:customer_left",
          data: { sessionId },
        })
      );
    }
  },

  error(ws: ServerWebSocket<WebSocketData>, error: Error) {
    console.error("[WebSocket] Error:", error);
  },
};

// Handler functions (to be implemented)
function handleCustomerMessage(ws: ServerWebSocket<WebSocketData>, data: any) {
  // TODO: Implement customer message handling
  console.log("[WebSocket] Customer message:", data);
}

function handleCsMessage(ws: ServerWebSocket<WebSocketData>, data: any) {
  // TODO: Implement CS message handling
  console.log("[WebSocket] CS message:", data);
}

function handleCsStatus(ws: ServerWebSocket<WebSocketData>, data: any) {
  // TODO: Implement CS status handling
  console.log("[WebSocket] CS status change:", data);
}
