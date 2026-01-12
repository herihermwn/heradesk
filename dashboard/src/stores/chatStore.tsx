import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import type { ChatSession, Message, CannedResponse, CsStatus, CsWithStatus, CsStats } from "../types";
import { csApi } from "../services/api";
import { useCsWebSocket, WS_EVENTS } from "../hooks/useWebSocket";

// ============================================
// STATE TYPES
// ============================================

interface ChatState {
  // Chat data
  activeChats: ChatSession[];
  selectedChatId: string | null;
  selectedChat: ChatSession | null;
  messages: Message[];
  queue: ChatSession[];

  // CS data
  csStatus: CsStatus | null;
  onlineCS: CsWithStatus[];
  stats: CsStats | null;
  cannedResponses: CannedResponse[];

  // UI state
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  customerTyping: boolean;
}

// ============================================
// ACTIONS
// ============================================

type ChatAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOADING_MESSAGES"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_ACTIVE_CHATS"; payload: ChatSession[] }
  | { type: "SET_QUEUE"; payload: ChatSession[] }
  | { type: "SELECT_CHAT"; payload: { chat: ChatSession; messages: Message[] } }
  | { type: "CLEAR_SELECTED_CHAT" }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGES"; payload: Message[] }
  | { type: "SET_CS_STATUS"; payload: CsStatus }
  | { type: "SET_ONLINE_CS"; payload: CsWithStatus[] }
  | { type: "SET_STATS"; payload: CsStats }
  | { type: "SET_CANNED_RESPONSES"; payload: CannedResponse[] }
  | { type: "SET_CUSTOMER_TYPING"; payload: boolean }
  | { type: "REMOVE_CHAT"; payload: string }
  | { type: "UPDATE_CHAT_IN_LIST"; payload: ChatSession };

// ============================================
// REDUCER
// ============================================

const initialState: ChatState = {
  activeChats: [],
  selectedChatId: null,
  selectedChat: null,
  messages: [],
  queue: [],
  csStatus: null,
  onlineCS: [],
  stats: null,
  cannedResponses: [],
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  customerTyping: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_LOADING_MESSAGES":
      return { ...state, isLoadingMessages: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_ACTIVE_CHATS":
      return { ...state, activeChats: action.payload };
    case "SET_QUEUE":
      return { ...state, queue: action.payload };
    case "SELECT_CHAT":
      return {
        ...state,
        selectedChatId: action.payload.chat.id,
        selectedChat: action.payload.chat,
        messages: action.payload.messages,
        customerTyping: false,
      };
    case "CLEAR_SELECTED_CHAT":
      return {
        ...state,
        selectedChatId: null,
        selectedChat: null,
        messages: [],
        customerTyping: false,
      };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGES":
      return { ...state, messages: action.payload };
    case "SET_CS_STATUS":
      return { ...state, csStatus: action.payload };
    case "SET_ONLINE_CS":
      return { ...state, onlineCS: action.payload };
    case "SET_STATS":
      return { ...state, stats: action.payload };
    case "SET_CANNED_RESPONSES":
      return { ...state, cannedResponses: action.payload };
    case "SET_CUSTOMER_TYPING":
      return { ...state, customerTyping: action.payload };
    case "REMOVE_CHAT":
      return {
        ...state,
        activeChats: state.activeChats.filter((c) => c.id !== action.payload),
        selectedChatId: state.selectedChatId === action.payload ? null : state.selectedChatId,
        selectedChat: state.selectedChatId === action.payload ? null : state.selectedChat,
        messages: state.selectedChatId === action.payload ? [] : state.messages,
      };
    case "UPDATE_CHAT_IN_LIST":
      return {
        ...state,
        activeChats: state.activeChats.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
        selectedChat:
          state.selectedChatId === action.payload.id
            ? action.payload
            : state.selectedChat,
      };
    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface ChatContextValue extends ChatState {
  // Actions
  loadActiveChats: () => Promise<void>;
  loadQueue: () => Promise<void>;
  loadCsStatus: () => Promise<void>;
  loadOnlineCS: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadCannedResponses: () => Promise<void>;
  selectChat: (sessionId: string) => Promise<void>;
  clearSelectedChat: () => void;
  acceptChat: (sessionId: string) => Promise<boolean>;
  resolveChat: (sessionId: string, notes?: string) => Promise<boolean>;
  transferChat: (sessionId: string, targetCsId: string) => Promise<boolean>;
  updateStatus: (status: "online" | "busy" | "offline") => Promise<boolean>;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
  createCannedResponse: (data: { title: string; content: string; shortcut?: string }) => Promise<boolean>;
  deleteCannedResponse: (id: string) => Promise<boolean>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface ChatProviderProps {
  children: ReactNode;
  token?: string;
}

export function ChatProvider({ children, token }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const ws = useCsWebSocket(token);

  // Load active chats
  const loadActiveChats = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await csApi.getChats();
      if (response.success && response.data) {
        dispatch({ type: "SET_ACTIVE_CHATS", payload: response.data });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load active chats" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Load queue
  const loadQueue = useCallback(async () => {
    try {
      const response = await csApi.getQueue();
      if (response.success && response.data) {
        dispatch({ type: "SET_QUEUE", payload: response.data });
      }
    } catch (error) {
      console.error("[ChatStore] Load queue error:", error);
    }
  }, []);

  // Load CS status
  const loadCsStatus = useCallback(async () => {
    try {
      const response = await csApi.getStatus();
      if (response.success && response.data) {
        dispatch({ type: "SET_CS_STATUS", payload: response.data });
      }
    } catch (error) {
      console.error("[ChatStore] Load CS status error:", error);
    }
  }, []);

  // Load online CS
  const loadOnlineCS = useCallback(async () => {
    try {
      const response = await csApi.getOnlineCS();
      if (response.success && response.data) {
        dispatch({ type: "SET_ONLINE_CS", payload: response.data });
      }
    } catch (error) {
      console.error("[ChatStore] Load online CS error:", error);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await csApi.getStats();
      if (response.success && response.data) {
        dispatch({ type: "SET_STATS", payload: response.data });
      }
    } catch (error) {
      console.error("[ChatStore] Load stats error:", error);
    }
  }, []);

  // Load canned responses
  const loadCannedResponses = useCallback(async () => {
    try {
      const response = await csApi.getCannedResponses();
      if (response.success && response.data) {
        dispatch({ type: "SET_CANNED_RESPONSES", payload: response.data });
      }
    } catch (error) {
      console.error("[ChatStore] Load canned responses error:", error);
    }
  }, []);

  // Select chat
  const selectChat = useCallback(async (sessionId: string) => {
    dispatch({ type: "SET_LOADING_MESSAGES", payload: true });
    try {
      const response = await csApi.getChatDetail(sessionId);
      if (response.success && response.data) {
        dispatch({
          type: "SELECT_CHAT",
          payload: {
            chat: response.data.session,
            messages: response.data.session.messages || [],
          },
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load chat details" });
    } finally {
      dispatch({ type: "SET_LOADING_MESSAGES", payload: false });
    }
  }, []);

  // Clear selected chat
  const clearSelectedChat = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTED_CHAT" });
  }, []);

  // Accept chat
  const acceptChat = useCallback(async (sessionId: string) => {
    try {
      const response = await csApi.acceptChat(sessionId);
      if (response.success) {
        await loadActiveChats();
        await loadQueue();
        await selectChat(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to accept chat" });
      return false;
    }
  }, [loadActiveChats, loadQueue, selectChat]);

  // Resolve chat
  const resolveChat = useCallback(async (sessionId: string, notes?: string) => {
    try {
      const response = await csApi.resolveChat(sessionId, notes);
      if (response.success) {
        dispatch({ type: "REMOVE_CHAT", payload: sessionId });
        await loadStats();
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to resolve chat" });
      return false;
    }
  }, [loadStats]);

  // Transfer chat
  const transferChat = useCallback(async (sessionId: string, targetCsId: string) => {
    try {
      const response = await csApi.transferChat(sessionId, targetCsId);
      if (response.success) {
        dispatch({ type: "REMOVE_CHAT", payload: sessionId });
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to transfer chat" });
      return false;
    }
  }, []);

  // Update status
  const updateStatus = useCallback(async (status: "online" | "busy" | "offline") => {
    try {
      const response = await csApi.updateStatus(status);
      if (response.success && response.data) {
        dispatch({ type: "SET_CS_STATUS", payload: response.data });
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to update status" });
      return false;
    }
  }, []);

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!state.selectedChatId) return;

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionId: state.selectedChatId,
      senderType: "cs",
      content,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_MESSAGE", payload: optimisticMessage });

    // Send via WebSocket
    ws.sendMessage(state.selectedChatId, content);
  }, [state.selectedChatId, ws]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!state.selectedChatId) return;
    ws.sendTyping(state.selectedChatId, isTyping);
  }, [state.selectedChatId, ws]);

  // Create canned response
  const createCannedResponse = useCallback(async (data: { title: string; content: string; shortcut?: string }) => {
    try {
      const response = await csApi.createCannedResponse(data);
      if (response.success) {
        await loadCannedResponses();
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to create canned response" });
      return false;
    }
  }, [loadCannedResponses]);

  // Delete canned response
  const deleteCannedResponse = useCallback(async (id: string) => {
    try {
      const response = await csApi.deleteCannedResponse(id);
      if (response.success) {
        await loadCannedResponses();
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to delete canned response" });
      return false;
    }
  }, [loadCannedResponses]);

  // WebSocket event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    // New chat assigned
    const unsubNewAssigned = ws.on(WS_EVENTS.SERVER.CS_NEW_ASSIGNED, () => {
      loadActiveChats();
      loadQueue();
    });

    // Chat transferred in
    const unsubTransferredIn = ws.on(WS_EVENTS.SERVER.CS_TRANSFERRED_IN, () => {
      loadActiveChats();
    });

    // Chat transferred out
    const unsubTransferredOut = ws.on(WS_EVENTS.SERVER.CS_TRANSFERRED_OUT, (data: any) => {
      dispatch({ type: "REMOVE_CHAT", payload: data.sessionId });
    });

    // New message
    const unsubMessage = ws.on(WS_EVENTS.SERVER.CHAT_MESSAGE, (data: any) => {
      // Skip CS messages as they're added via optimistic update
      if (data.message?.senderType === "cs") {
        return;
      }
      if (data.sessionId === state.selectedChatId) {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
      }
    });

    // Customer typing
    const unsubCustomerTyping = ws.on(WS_EVENTS.SERVER.CHAT_CUSTOMER_TYPING, (data: any) => {
      if (data.sessionId === state.selectedChatId) {
        dispatch({ type: "SET_CUSTOMER_TYPING", payload: data.isTyping });
      }
    });

    // Customer left
    const unsubCustomerLeft = ws.on(WS_EVENTS.SERVER.CHAT_CUSTOMER_LEFT, (data: any) => {
      if (data.sessionId === state.selectedChatId) {
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            id: `system-${Date.now()}`,
            sessionId: data.sessionId,
            senderType: "system",
            content: "Customer has left the chat",
            messageType: "system",
            createdAt: new Date().toISOString(),
          },
        });
      }
      loadActiveChats();
    });

    // Queue update
    const unsubQueueUpdate = ws.on(WS_EVENTS.SERVER.QUEUE_UPDATE, () => {
      loadQueue();
    });

    // New chat in queue
    const unsubNewChat = ws.on(WS_EVENTS.SERVER.QUEUE_NEW_CHAT, () => {
      loadQueue();
    });

    // Chat resolved
    const unsubResolved = ws.on(WS_EVENTS.SERVER.CHAT_RESOLVED, (data: any) => {
      dispatch({ type: "REMOVE_CHAT", payload: data.sessionId });
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
    };
  }, [ws.isConnected, ws.on, state.selectedChatId, loadActiveChats, loadQueue]);

  const value: ChatContextValue = {
    ...state,
    loadActiveChats,
    loadQueue,
    loadCsStatus,
    loadOnlineCS,
    loadStats,
    loadCannedResponses,
    selectChat,
    clearSelectedChat,
    acceptChat,
    resolveChat,
    transferChat,
    updateStatus,
    sendMessage,
    sendTyping,
    createCannedResponse,
    deleteCannedResponse,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatStore must be used within a ChatProvider");
  }
  return context;
}

export default ChatProvider;
