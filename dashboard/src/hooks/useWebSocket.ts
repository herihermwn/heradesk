import { useState, useEffect, useCallback, useRef } from "react";
import type { WebSocketStatus } from "../types";
import {
  WebSocketService,
  getCustomerWebSocket,
  getCsWebSocket,
  getAdminWebSocket,
  WS_EVENTS,
} from "../services/websocket";

// ============================================
// TYPES
// ============================================

type Role = "customer" | "cs" | "admin";

interface UseWebSocketOptions {
  role: Role;
  token?: string;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (event: string, data?: any) => void;
  on: <T = any>(event: string, callback: (data: T) => void) => () => void;
}

// ============================================
// HOOK
// ============================================

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { role, token, autoConnect = true } = options;
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const wsRef = useRef<WebSocketService | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    switch (role) {
      case "customer":
        wsRef.current = getCustomerWebSocket(token);
        break;
      case "cs":
        wsRef.current = getCsWebSocket(token);
        break;
      case "admin":
        wsRef.current = getAdminWebSocket(token);
        break;
    }

    // Subscribe to status changes
    const unsubscribe = wsRef.current.onStatus(setStatus);

    // Set initial status
    setStatus(wsRef.current.getStatus());

    // Auto connect if enabled
    if (autoConnect) {
      wsRef.current.connect();
    }

    return () => {
      unsubscribe();
    };
  }, [role, autoConnect]);

  // Update token when it changes
  useEffect(() => {
    if (token && wsRef.current) {
      wsRef.current.updateToken(token);
    }
  }, [token]);

  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  const send = useCallback((event: string, data: any = {}) => {
    wsRef.current?.send(event, data);
  }, []);

  const on = useCallback(
    <T = any>(event: string, callback: (data: T) => void) => {
      if (!wsRef.current) {
        return () => {};
      }
      return wsRef.current.on(event, callback);
    },
    []
  );

  return {
    status,
    isConnected: status === "connected",
    connect,
    disconnect,
    send,
    on,
  };
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Hook for customer chat WebSocket
 */
export function useCustomerWebSocket(sessionToken?: string) {
  const ws = useWebSocket({
    role: "customer",
    token: sessionToken,
    autoConnect: false,
  });

  // Track the current session ID
  const sessionIdRef = useRef<string | null>(null);

  // Listen for chat:started to capture sessionId
  useEffect(() => {
    const unsubStarted = ws.on("chat:started", (data: any) => {
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }
    });

    const unsubRestored = ws.on("session:restored", (data: any) => {
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }
    });

    return () => {
      unsubStarted();
      unsubRestored();
    };
  }, [ws]);

  const startChat = useCallback(
    (data: { customerName?: string; customerEmail?: string }) => {
      ws.send(WS_EVENTS.CUSTOMER.START_CHAT, data);
    },
    [ws]
  );

  const sendMessage = useCallback(
    (content: string) => {
      ws.send(WS_EVENTS.CUSTOMER.SEND_MESSAGE, {
        sessionId: sessionIdRef.current,
        content,
      });
    },
    [ws]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      ws.send(WS_EVENTS.CUSTOMER.TYPING, {
        sessionId: sessionIdRef.current,
        isTyping,
      });
    },
    [ws]
  );

  const endChat = useCallback(() => {
    ws.send(WS_EVENTS.CUSTOMER.END_CHAT, {
      sessionId: sessionIdRef.current,
    });
  }, [ws]);

  const submitRating = useCallback(
    (rating: number, feedback?: string) => {
      ws.send(WS_EVENTS.CUSTOMER.RATING, {
        sessionId: sessionIdRef.current,
        rating,
        feedback,
      });
    },
    [ws]
  );

  return {
    ...ws,
    startChat,
    sendMessage,
    sendTyping,
    endChat,
    submitRating,
  };
}

/**
 * Hook for CS WebSocket
 */
export function useCsWebSocket(token?: string) {
  const ws = useWebSocket({
    role: "cs",
    token,
    autoConnect: !!token,
  });

  const setStatus = useCallback(
    (state: "online" | "busy" | "offline") => {
      ws.send(WS_EVENTS.CS.SET_STATUS, { state });
    },
    [ws]
  );

  const acceptChat = useCallback(
    (sessionId: string) => {
      ws.send(WS_EVENTS.CS.ACCEPT_CHAT, { sessionId });
    },
    [ws]
  );

  const sendMessage = useCallback(
    (sessionId: string, content: string) => {
      ws.send(WS_EVENTS.CS.SEND_MESSAGE, { sessionId, content });
    },
    [ws]
  );

  const sendTyping = useCallback(
    (sessionId: string, isTyping: boolean) => {
      ws.send(WS_EVENTS.CS.TYPING, { sessionId, isTyping });
    },
    [ws]
  );

  const resolveChat = useCallback(
    (sessionId: string, notes?: string) => {
      ws.send(WS_EVENTS.CS.RESOLVE_CHAT, { sessionId, notes });
    },
    [ws]
  );

  const transferChat = useCallback(
    (sessionId: string, targetCsId: string) => {
      ws.send(WS_EVENTS.CS.TRANSFER_CHAT, { sessionId, targetCsId });
    },
    [ws]
  );

  return {
    ...ws,
    setStatus,
    acceptChat,
    sendMessage,
    sendTyping,
    resolveChat,
    transferChat,
  };
}

/**
 * Hook for Admin WebSocket
 */
export function useAdminWebSocket(token?: string) {
  const ws = useWebSocket({
    role: "admin",
    token,
    autoConnect: !!token,
  });

  const subscribeStats = useCallback(() => {
    ws.send(WS_EVENTS.ADMIN.SUBSCRIBE_STATS, {});
  }, [ws]);

  const forceAssign = useCallback(
    (sessionId: string, csId: string) => {
      ws.send(WS_EVENTS.ADMIN.FORCE_ASSIGN, { sessionId, csId });
    },
    [ws]
  );

  return {
    ...ws,
    subscribeStats,
    forceAssign,
  };
}

// Re-export events for convenience
export { WS_EVENTS };

export default useWebSocket;
