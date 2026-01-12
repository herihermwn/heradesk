import type { WebSocketConfig, WebSocketMessage, WebSocketStatus } from "../types";

// ============================================
// TYPES
// ============================================

type EventCallback<T = any> = (data: T) => void;
type StatusCallback = (status: WebSocketStatus) => void;

// ============================================
// WEBSOCKET SERVICE CLASS
// ============================================

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private status: WebSocketStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private statusListeners: Set<StatusCallback> = new Set();
  private pendingMessages: string[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    this.setStatus("connecting");

    const wsUrl = this.buildUrl();
    console.log("[WebSocket] Connecting to:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      this.setStatus("error");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setStatus("disconnected");
  }

  private buildUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const path = `/ws/${this.config.role}`;
    const params = new URLSearchParams();

    if (this.config.token) {
      params.set("token", this.config.token);
    }

    const queryString = params.toString();
    return `${protocol}//${host}${path}${queryString ? `?${queryString}` : ""}`;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected");
      this.setStatus("connected");
      this.reconnectAttempts = 0;
      this.flushPendingMessages();
    };

    this.ws.onclose = (event) => {
      console.log("[WebSocket] Closed:", event.code, event.reason);
      this.setStatus("disconnected");

      if (event.code !== 1000 && this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      this.setStatus("error");
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log("[WebSocket] Received:", message.event);

    const listeners = this.eventListeners.get(message.event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(message.data);
        } catch (error) {
          console.error("[WebSocket] Listener error:", error);
        }
      });
    }

    // Also notify wildcard listeners
    const wildcardListeners = this.eventListeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error("[WebSocket] Wildcard listener error:", error);
        }
      });
    }
  }

  // ============================================
  // RECONNECTION
  // ============================================

  private scheduleReconnect(): void {
    if (
      this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)
    ) {
      console.log("[WebSocket] Max reconnect attempts reached");
      this.setStatus("error");
      return;
    }

    this.clearReconnectTimer();

    const delay =
      (this.config.reconnectInterval || 3000) *
      Math.pow(1.5, this.reconnectAttempts);

    console.log(
      `[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${
        this.reconnectAttempts + 1
      })`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  private setStatus(status: WebSocketStatus): void {
    if (this.status === status) return;

    this.status = status;
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("[WebSocket] Status listener error:", error);
      }
    });
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // MESSAGE SENDING
  // ============================================

  send(event: string, data: any = {}): void {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    if (this.isConnected()) {
      console.log("[WebSocket] Sending:", event);
      this.ws!.send(messageStr);
    } else {
      console.log("[WebSocket] Queuing message:", event);
      this.pendingMessages.push(messageStr);
    }
  }

  private flushPendingMessages(): void {
    if (!this.isConnected() || this.pendingMessages.length === 0) return;

    console.log(
      `[WebSocket] Flushing ${this.pendingMessages.length} pending messages`
    );

    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift()!;
      this.ws!.send(message);
    }
  }

  // ============================================
  // EVENT SUBSCRIPTION
  // ============================================

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
    } else {
      this.eventListeners.delete(event);
    }
  }

  onStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  updateToken(token: string): void {
    this.config.token = token;
    if (this.isConnected()) {
      this.disconnect();
      this.connect();
    }
  }
}

// ============================================
// WEBSOCKET EVENT NAMES (matching backend)
// ============================================

export const WS_EVENTS = {
  // Customer events
  CUSTOMER: {
    START_CHAT: "customer:start_chat",
    SEND_MESSAGE: "customer:send_message",
    TYPING: "customer:typing",
    END_CHAT: "customer:end_chat",
    RATING: "customer:rating",
  },

  // CS events
  CS: {
    SET_STATUS: "cs:set_status",
    ACCEPT_CHAT: "cs:accept_chat",
    SEND_MESSAGE: "cs:send_message",
    TYPING: "cs:typing",
    RESOLVE_CHAT: "cs:resolve_chat",
    TRANSFER_CHAT: "cs:transfer_chat",
  },

  // Admin events
  ADMIN: {
    SUBSCRIBE_STATS: "admin:subscribe_stats",
    FORCE_ASSIGN: "admin:force_assign",
  },

  // Server events (received from backend)
  SERVER: {
    // Chat events
    CHAT_STARTED: "chat:started",
    CHAT_ASSIGNED: "chat:assigned",
    CHAT_MESSAGE: "chat:message",
    CHAT_ENDED: "chat:ended",
    CHAT_TRANSFERRED: "chat:transferred",
    CHAT_RESOLVED: "chat:resolved",
    CHAT_QUEUE_POSITION: "chat:queue_position",
    CHAT_CUSTOMER_TYPING: "chat:customer_typing",
    CHAT_CS_TYPING: "chat:cs_typing",
    CHAT_CUSTOMER_LEFT: "chat:customer_left",

    // CS events
    CS_NEW_ASSIGNED: "chat:new_assigned",
    CS_TRANSFERRED_IN: "chat:transferred_in",
    CS_TRANSFERRED_OUT: "chat:transferred_out",
    CS_STATUS_CHANGED: "cs:status_changed",

    // Queue events
    QUEUE_UPDATE: "queue:update",
    QUEUE_NEW_CHAT: "queue:new_chat",

    // Stats events
    STATS_UPDATE: "stats:update",
    STATS_CHAT_RESOLVED: "stats:chat_resolved",
    STATS_NEW_CHAT: "stats:new_chat",

    // Activity events
    ACTIVITY_NEW: "activity:new",

    // Error
    ERROR: "error",
  },
} as const;

// ============================================
// SINGLETON INSTANCES
// ============================================

let customerWs: WebSocketService | null = null;
let csWs: WebSocketService | null = null;
let adminWs: WebSocketService | null = null;

export function getCustomerWebSocket(token?: string): WebSocketService {
  if (!customerWs) {
    customerWs = new WebSocketService({
      url: "",
      role: "customer",
      token,
    });
  } else if (token) {
    customerWs.updateToken(token);
  }
  return customerWs;
}

export function getCsWebSocket(token?: string): WebSocketService {
  if (!csWs) {
    csWs = new WebSocketService({
      url: "",
      role: "cs",
      token,
    });
  } else if (token) {
    csWs.updateToken(token);
  }
  return csWs;
}

export function getAdminWebSocket(token?: string): WebSocketService {
  if (!adminWs) {
    adminWs = new WebSocketService({
      url: "",
      role: "admin",
      token,
    });
  } else if (token) {
    adminWs.updateToken(token);
  }
  return adminWs;
}

export default WebSocketService;
