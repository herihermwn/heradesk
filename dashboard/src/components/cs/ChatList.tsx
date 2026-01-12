import React from "react";
import type { ChatSession } from "../../types";

// ============================================
// TYPES
// ============================================

interface ChatListProps {
  title: string;
  chats: ChatSession[];
  selectedChatId?: string | null;
  onSelect: (sessionId: string) => void;
  onAccept?: (sessionId: string) => void;
  isQueue?: boolean;
  emptyMessage?: string;
}

interface ChatItemProps {
  chat: ChatSession;
  isSelected: boolean;
  onClick: () => void;
  onAccept?: () => void;
  isQueue?: boolean;
}

// ============================================
// CHAT ITEM COMPONENT
// ============================================

function ChatItem({ chat, isSelected, onClick, onAccept, isQueue }: ChatItemProps) {
  const lastMessage = chat.messages?.[0];
  const unreadCount = chat._count?.messages || 0;

  // Format time
  const formatTime = (dateStr: string | Date | undefined | null) => {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary-500 bg-primary-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-gray-600 font-semibold">
            {(chat.customerName || "G")[0].toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-gray-800 truncate">
              {chat.customerName || "Guest"}
            </h4>
            <span className="text-xs text-gray-500 shrink-0">
              {formatTime(chat.updatedAt || chat.createdAt)}
            </span>
          </div>

          {lastMessage && (
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {lastMessage.senderType === "cs" && (
                <span className="text-primary-600">Anda: </span>
              )}
              {lastMessage.content}
            </p>
          )}

          {chat.status === "waiting" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                Menunggu
              </span>
              {isQueue && onAccept && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept();
                  }}
                  className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded hover:bg-primary-600 transition-colors"
                >
                  Terima
                </button>
              )}
            </div>
          )}

          {unreadCount > 0 && chat.status === "active" && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary-500 rounded-full mt-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-4 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ============================================
// MAIN CHAT LIST COMPONENT
// ============================================

export function ChatList({
  title,
  chats,
  selectedChatId,
  onSelect,
  onAccept,
  isQueue = false,
  emptyMessage = "Tidak ada chat",
}: ChatListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800 flex items-center justify-between">
          {title}
          {chats.length > 0 && (
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {chats.length}
            </span>
          )}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          chats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onClick={() => onSelect(chat.id)}
              onAccept={onAccept ? () => onAccept(chat.id) : undefined}
              isQueue={isQueue}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ChatList;
