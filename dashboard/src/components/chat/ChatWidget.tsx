import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Message, ChatWidgetState } from "../../types";
import { chatApi } from "../../services/api";
import { useCustomerWebSocket, WS_EVENTS } from "../../hooks/useWebSocket";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

// ============================================
// TYPES
// ============================================

interface ChatWidgetProps {
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
}

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  SESSION_TOKEN: "heradesk_session_token",
  CUSTOMER_NAME: "heradesk_customer_name",
  CUSTOMER_EMAIL: "heradesk_customer_email",
};

// ============================================
// COMPONENT
// ============================================

export function ChatWidget({
  position = "bottom-right",
  primaryColor,
  title = "Chat with Us",
  subtitle = "We're here to help",
  placeholder = "Type a message...",
}: ChatWidgetProps) {
  // State
  const [state, setState] = useState<ChatWidgetState>({
    isOpen: false,
    isMinimized: false,
    sessionToken: localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN),
    customerName: localStorage.getItem(STORAGE_KEYS.CUSTOMER_NAME) || "",
    customerEmail: localStorage.getItem(STORAGE_KEYS.CUSTOMER_EMAIL) || "",
    hasStarted: false,
    isConnected: false,
    isTyping: false,
    csTyping: false,
    queuePosition: null,
    assignedCs: null,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket
  const ws = useCustomerWebSocket(state.sessionToken || undefined);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (token) {
      loadExistingSession(token);
    }
  }, []);

  // WebSocket status
  useEffect(() => {
    setState((prev) => ({ ...prev, isConnected: ws.isConnected }));
  }, [ws.isConnected]);

  // WebSocket event listeners
  useEffect(() => {
    if (!ws.isConnected) return;

    // Chat started
    const unsubStarted = ws.on(WS_EVENTS.SERVER.CHAT_STARTED, (data: any) => {
      const token = data.customerToken || data.session?.customerToken;
      setState((prev) => ({
        ...prev,
        sessionToken: token,
        hasStarted: true,
      }));
      if (token) {
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
      }
      addSystemMessage("Chat dimulai. Menghubungkan ke agen...");
    });

    // Chat assigned
    const unsubAssigned = ws.on(WS_EVENTS.SERVER.CHAT_ASSIGNED, (data: any) => {
      setState((prev) => ({
        ...prev,
        assignedCs: data.cs,
        queuePosition: null,
      }));
      addSystemMessage(`You are now connected with ${data.cs.name}`);
    });

    // New message (skip customer messages as they're added optimistically)
    const unsubMessage = ws.on(WS_EVENTS.SERVER.CHAT_MESSAGE, (data: any) => {
      if (data.message?.senderType === "customer") {
        return; // Skip, already added via optimistic update
      }
      setMessages((prev) => [...prev, data.message]);
    });

    // Queue position
    const unsubQueue = ws.on(WS_EVENTS.SERVER.CHAT_QUEUE_POSITION, (data: any) => {
      setState((prev) => ({ ...prev, queuePosition: data.position }));
    });

    // CS typing
    const unsubCsTyping = ws.on(WS_EVENTS.SERVER.CHAT_CS_TYPING, (data: any) => {
      setState((prev) => ({ ...prev, csTyping: data.isTyping }));
    });

    // Chat ended
    const unsubEnded = ws.on(WS_EVENTS.SERVER.CHAT_ENDED, (data: any) => {
      addSystemMessage("Chat has ended. Thank you!");
      setState((prev) => ({
        ...prev,
        hasStarted: false,
        assignedCs: null,
      }));
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    });

    // Error
    const unsubError = ws.on(WS_EVENTS.SERVER.ERROR, (data: any) => {
      setError(data.message || "Terjadi kesalahan");
    });

    return () => {
      unsubStarted();
      unsubAssigned();
      unsubMessage();
      unsubQueue();
      unsubCsTyping();
      unsubEnded();
      unsubError();
    };
  }, [ws.isConnected, ws.on]);

  // Load existing session
  const loadExistingSession = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await chatApi.getSession(token);
      if (response.success && response.data) {
        const { session } = response.data;
        setState((prev) => ({
          ...prev,
          hasStarted: true,
          assignedCs: session.cs
            ? { id: session.cs.id, name: session.cs.name, avatarUrl: session.cs.avatarUrl }
            : null,
        }));
        if (session.messages) {
          setMessages(session.messages);
        }
        // Connect WebSocket
        ws.connect();
      } else {
        // Session not found, clear storage
        localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
        setState((prev) => ({ ...prev, sessionToken: null }));
      }
    } catch (err) {
      console.error("[ChatWidget] Load session error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add system message
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      sessionId: "",
      senderType: "system",
      content,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Toggle widget
  const toggleWidget = () => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  };

  // Start chat
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Save customer info
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_NAME, state.customerName);
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_EMAIL, state.customerEmail);

      // Connect WebSocket
      ws.connect();

      // Start chat via WebSocket
      ws.startChat({
        customerName: state.customerName || undefined,
        customerEmail: state.customerEmail || undefined,
      });
    } catch (err) {
      console.error("[ChatWidget] Start chat error:", err);
      setError("Gagal memulai chat. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionId: "",
      senderType: "customer",
      content,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send via WebSocket
    ws.sendMessage(content);
  };

  // Handle typing
  const handleTyping = (isTyping: boolean) => {
    ws.sendTyping(isTyping);
  };

  // End chat
  const handleEndChat = () => {
    ws.endChat();
  };

  // Position classes
  const positionClasses =
    position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";

  return (
    <>
      {/* Chat Window */}
      {state.isOpen && (
        <div
          className={`fixed bottom-20 ${positionClasses} w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50`}
          style={{ height: "500px", maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-white/80">
                {state.assignedCs
                  ? `Connected with ${state.assignedCs.name}`
                  : state.hasStarted
                  ? state.queuePosition
                    ? `Queue position: ${state.queuePosition}`
                    : "Waiting for agent..."
                  : subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <span
                className={`w-2 h-2 rounded-full ${
                  ws.isConnected ? "bg-green-400" : "bg-red-400"
                }`}
                title={ws.isConnected ? "Connected" : "Disconnected"}
              />
              {/* Close button */}
              <button
                onClick={toggleWidget}
                className="p-1 hover:bg-white/20 rounded"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!state.hasStarted ? (
              /* Pre-chat Form */
              <div className="flex-1 p-4 flex flex-col justify-center">
                <form onSubmit={handleStartChat} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={state.customerName}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="Your name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={state.customerEmail}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          customerEmail: e.target.value,
                        }))
                      }
                      placeholder="email@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Starting..." : "Start Chat"}
                  </button>
                </form>
              </div>
            ) : (
              /* Chat Messages */
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderType === "customer"}
                      showAvatar={message.senderType === "cs"}
                      avatarUrl={state.assignedCs?.avatarUrl}
                      senderName={state.assignedCs?.name}
                    />
                  ))}
                  {state.csTyping && (
                    <TypingIndicator senderName={state.assignedCs?.name} />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <MessageInput
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  placeholder={placeholder}
                  disabled={!ws.isConnected}
                />
              </>
            )}
          </div>

          {/* Footer - End Chat */}
          {state.hasStarted && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleEndChat}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                End Chat
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleWidget}
        className={`fixed bottom-4 sm:bottom-6 ${positionClasses} w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-105`}
        title={state.isOpen ? "Close chat" : "Open chat"}
      >
        {state.isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}

        {/* Unread indicator */}
        {!state.isOpen && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {messages.filter((m) => m.senderType !== "customer").length}
          </span>
        )}
      </button>
    </>
  );
}

export default ChatWidget;
