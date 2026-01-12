import React, { createContext, useContext, useReducer, useCallback } from "react";

// ============================================
// TYPES
// ============================================

export type NotificationType = "info" | "success" | "warning" | "error" | "chat";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  data?: any;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

type NotificationAction =
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_AS_READ"; payload: string }
  | { type: "MARK_ALL_AS_READ" }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_ALL" };

// ============================================
// INITIAL STATE
// ============================================

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

// ============================================
// REDUCER
// ============================================

function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Keep last 50
        unreadCount: state.unreadCount + 1,
      };

    case "MARK_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case "MARK_ALL_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };

    case "REMOVE_NOTIFICATION":
      const toRemove = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
        unreadCount: toRemove && !toRemove.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };

    case "CLEAR_ALL":
      return initialState;

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface NotificationContextType extends NotificationState {
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    data?: any
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Helper methods
  notifyNewChat: (sessionId: string, customerName?: string) => void;
  notifyMessage: (sessionId: string, content: string) => void;
  notifyAssignment: (sessionId: string) => void;
  notifyTransfer: (sessionId: string, fromName: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      link?: string,
      data?: any
    ) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: new Date(),
        read: false,
        link,
        data,
      };
      dispatch({ type: "ADD_NOTIFICATION", payload: notification });

      // Play notification sound for chat notifications
      if (type === "chat") {
        playNotificationSound();
      }
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: "MARK_AS_READ", payload: id });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: "MARK_ALL_AS_READ" });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  // Helper methods for common notifications
  const notifyNewChat = useCallback(
    (sessionId: string, customerName?: string) => {
      addNotification(
        "chat",
        "Chat Baru",
        customerName
          ? `${customerName} memulai chat baru`
          : "Ada chat baru di antrian",
        `/cs?session=${sessionId}`,
        { sessionId }
      );
    },
    [addNotification]
  );

  const notifyMessage = useCallback(
    (sessionId: string, content: string) => {
      addNotification(
        "chat",
        "Pesan Baru",
        content.length > 50 ? content.substring(0, 50) + "..." : content,
        `/cs?session=${sessionId}`,
        { sessionId }
      );
    },
    [addNotification]
  );

  const notifyAssignment = useCallback(
    (sessionId: string) => {
      addNotification(
        "info",
        "Chat Diterima",
        "Anda menerima chat baru. Silakan mulai percakapan.",
        `/cs?session=${sessionId}`,
        { sessionId }
      );
    },
    [addNotification]
  );

  const notifyTransfer = useCallback(
    (sessionId: string, fromName: string) => {
      addNotification(
        "info",
        "Chat Ditransfer",
        `Chat ditransfer dari ${fromName}`,
        `/cs?session=${sessionId}`,
        { sessionId }
      );
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        notifyNewChat,
        notifyMessage,
        notifyAssignment,
        notifyTransfer,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// ============================================
// NOTIFICATION SOUND
// ============================================

function playNotificationSound() {
  try {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug("[Notification] Could not play sound:", error);
  }
}

// ============================================
// NOTIFICATION BELL COMPONENT
// ============================================

interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

// ============================================
// NOTIFICATION LIST COMPONENT
// ============================================

export function NotificationList() {
  const { notifications, markAsRead, removeNotification, markAllAsRead, clearAll } =
    useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-2 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p>Tidak ada notifikasi</p>
      </div>
    );
  }

  const typeIcons = {
    info: (
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    success: (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    chat: (
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    ),
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Notifikasi</span>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            Tandai semua dibaca
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Hapus semua
          </button>
        </div>
      </div>

      {/* Notification items */}
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${
              !notification.read ? "bg-blue-50/50" : ""
            }`}
          >
            {typeIcons[notification.type]}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {notification.message}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {formatTime(notification.timestamp)}
                </span>
                {notification.link && (
                  <a
                    href={notification.link}
                    onClick={() => markAsRead(notification.id)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Lihat
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
