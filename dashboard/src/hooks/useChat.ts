import { useState, useEffect, useCallback, useRef } from "react";
import type { Message, ChatSession } from "../types";
import { csApi } from "../services/api";
import { useCsWebSocket, WS_EVENTS } from "./useWebSocket";

// ============================================
// TYPES
// ============================================

interface ChatState {
  activeChats: ChatSession[];
  selectedChat: ChatSession | null;
  messages: Message[];
  queue: ChatSession[];
  isLoading: boolean;
  error: string | null;
}

interface UseChatReturn extends ChatState {
  selectChat: (sessionId: string) => Promise<void>;
  acceptChat: (sessionId: string) => Promise<void>;
  resolveChat: (sessionId: string, notes?: string) => Promise<void>;
  transferChat: (sessionId: string, targetCsId: string) => Promise<void>;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
  refreshChats: () => Promise<void>;
  refreshQueue: () => Promise<void>;
  customerTyping: boolean;
}

// ============================================
// HOOK
// ============================================

export function useChat(token?: string): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    activeChats: [],
    selectedChat: null,
    messages: [],
    queue: [],
    isLoading: false,
    error: null,
  });

  const [customerTyping, setCustomerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WebSocket connection
  const ws = useCsWebSocket(token);

  // Load initial data
  useEffect(() => {
    if (token) {
      refreshChats();
      refreshQueue();
    }
  }, [token]);

  // WebSocket event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    // New chat assigned
    const unsubNewAssigned = ws.on(
      WS_EVENTS.SERVER.CS_NEW_ASSIGNED,
      (data: any) => {
        refreshChats();
        refreshQueue();
      }
    );

    // Chat transferred in
    const unsubTransferredIn = ws.on(
      WS_EVENTS.SERVER.CS_TRANSFERRED_IN,
      (data: any) => {
        refreshChats();
      }
    );

    // Chat transferred out
    const unsubTransferredOut = ws.on(
      WS_EVENTS.SERVER.CS_TRANSFERRED_OUT,
      (data: any) => {
        if (state.selectedChat?.id === data.sessionId) {
          setState((prev) => ({ ...prev, selectedChat: null, messages: [] }));
        }
        refreshChats();
      }
    );

    // New message
    const unsubMessage = ws.on(WS_EVENTS.SERVER.CHAT_MESSAGE, (data: any) => {
      // Skip CS messages as they're added via optimistic update
      if (data.message?.senderType === "cs") {
        return;
      }

      if (data.sessionId === state.selectedChat?.id) {
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, data.message],
        }));
      }
      // Update unread count in active chats
      setState((prev) => ({
        ...prev,
        activeChats: prev.activeChats.map((chat) =>
          chat.id === data.sessionId
            ? { ...chat, _count: { messages: (chat._count?.messages || 0) + 1 } }
            : chat
        ),
      }));
    });

    // Customer typing
    const unsubCustomerTyping = ws.on(
      WS_EVENTS.SERVER.CHAT_CUSTOMER_TYPING,
      (data: any) => {
        if (data.sessionId === state.selectedChat?.id) {
          setCustomerTyping(data.isTyping);

          // Auto-clear typing after 3 seconds
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (data.isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setCustomerTyping(false);
            }, 3000);
          }
        }
      }
    );

    // Customer left
    const unsubCustomerLeft = ws.on(
      WS_EVENTS.SERVER.CHAT_CUSTOMER_LEFT,
      (data: any) => {
        if (state.selectedChat?.id === data.sessionId) {
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `system-${Date.now()}`,
                sessionId: data.sessionId,
                senderType: "system" as const,
                content: "Customer has left the chat",
                messageType: "text" as const,
                createdAt: new Date().toISOString(),
              },
            ],
          }));
        }
        refreshChats();
      }
    );

    // Queue update
    const unsubQueueUpdate = ws.on(WS_EVENTS.SERVER.QUEUE_UPDATE, () => {
      refreshQueue();
    });

    // New chat in queue
    const unsubNewChat = ws.on(WS_EVENTS.SERVER.QUEUE_NEW_CHAT, () => {
      refreshQueue();
    });

    // Chat resolved
    const unsubResolved = ws.on(WS_EVENTS.SERVER.CHAT_RESOLVED, (data: any) => {
      if (state.selectedChat?.id === data.sessionId) {
        setState((prev) => ({ ...prev, selectedChat: null, messages: [] }));
      }
      refreshChats();
    });

    return () => {
      unsubNewAssigned();
      unsubTransferredIn();
      unsubTransferredOut();
      unsubMessage();
      unsubCustomerTyping();
      unsubCustomerLeft();
      unsubQueueUpdate();
      unsubNewChat();
      unsubResolved();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [ws.isConnected, ws.on, state.selectedChat?.id]);

  // Refresh active chats
  const refreshChats = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await csApi.getChats();
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          activeChats: response.data!,
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to load chats",
        isLoading: false,
      }));
    }
  }, []);

  // Refresh queue
  const refreshQueue = useCallback(async () => {
    try {
      const response = await csApi.getQueue();
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          queue: response.data!,
        }));
      }
    } catch (error) {
      console.error("[useChat] Refresh queue error:", error);
    }
  }, []);

  // Select chat
  const selectChat = useCallback(async (sessionId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await csApi.getChatDetail(sessionId);
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          selectedChat: response.data!.session,
          messages: response.data!.session.messages || [],
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to load chat details",
        isLoading: false,
      }));
    }
  }, []);

  // Accept chat from queue
  const acceptChat = useCallback(
    async (sessionId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await csApi.acceptChat(sessionId);
        if (response.success) {
          await refreshChats();
          await refreshQueue();
          await selectChat(sessionId);
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to accept chat",
          isLoading: false,
        }));
      }
    },
    [refreshChats, refreshQueue, selectChat]
  );

  // Resolve chat
  const resolveChat = useCallback(
    async (sessionId: string, notes?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await csApi.resolveChat(sessionId, notes);
        if (response.success) {
          if (state.selectedChat?.id === sessionId) {
            setState((prev) => ({
              ...prev,
              selectedChat: null,
              messages: [],
            }));
          }
          await refreshChats();
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to resolve chat",
          isLoading: false,
        }));
      }
    },
    [refreshChats, state.selectedChat?.id]
  );

  // Transfer chat
  const transferChat = useCallback(
    async (sessionId: string, targetCsId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await csApi.transferChat(sessionId, targetCsId);
        if (response.success) {
          if (state.selectedChat?.id === sessionId) {
            setState((prev) => ({
              ...prev,
              selectedChat: null,
              messages: [],
            }));
          }
          await refreshChats();
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to transfer chat",
          isLoading: false,
        }));
      }
    },
    [refreshChats, state.selectedChat?.id]
  );

  // Send message
  const sendMessage = useCallback(
    (content: string) => {
      if (!state.selectedChat) return;

      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sessionId: state.selectedChat.id,
        senderType: "cs",
        content,
        messageType: "text",
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimisticMessage],
      }));

      // Send via WebSocket
      ws.sendMessage(state.selectedChat.id, content);
    },
    [state.selectedChat, ws]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!state.selectedChat) return;
      ws.sendTyping(state.selectedChat.id, isTyping);
    },
    [state.selectedChat, ws]
  );

  return {
    ...state,
    selectChat,
    acceptChat,
    resolveChat,
    transferChat,
    sendMessage,
    sendTyping,
    refreshChats,
    refreshQueue,
    customerTyping,
  };
}

export default useChat;
