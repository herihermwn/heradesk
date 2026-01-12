import React from "react";
import type { Message, SenderType } from "../../types";

// ============================================
// TYPES
// ============================================

interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  senderName?: string;
}

// ============================================
// COMPONENT
// ============================================

export function MessageBubble({
  message,
  isOwn = false,
  showAvatar = false,
  avatarUrl,
  senderName,
}: MessageBubbleProps) {
  const { content, messageType, senderType, createdAt, fileUrl } = message;

  // System message style
  if (senderType === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  const formattedTime = formatTime(createdAt);

  return (
    <div
      className={`flex gap-2 mb-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={senderName || "Avatar"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                isOwn ? "bg-primary-500" : "bg-gray-400"
              }`}
            >
              {getInitial(senderName)}
            </div>
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}
      >
        {/* Sender name */}
        {showAvatar && senderName && !isOwn && (
          <div className="text-xs text-gray-500 mb-1 ml-1">{senderName}</div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? "bg-primary-500 text-white rounded-br-md"
              : "bg-gray-100 text-gray-900 rounded-bl-md"
          }`}
        >
          {/* Text message */}
          {(!messageType || messageType === "text") && content && (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          )}

          {/* Image message */}
          {messageType === "image" && fileUrl && (
            <div>
              <img
                src={fileUrl}
                alt="Image"
                className="max-w-full rounded-lg cursor-pointer"
                onClick={() => window.open(fileUrl, "_blank")}
              />
              {content && (
                <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                  {content}
                </p>
              )}
            </div>
          )}

          {/* File message */}
          {messageType === "file" && fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-sm ${
                isOwn ? "text-white/90 hover:text-white" : "text-primary hover:underline"
              }`}
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{content || "Download File"}</span>
            </a>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-400 mt-1 ${
            isOwn ? "text-right mr-1" : "ml-1"
          }`}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TYPING INDICATOR
// ============================================

interface TypingIndicatorProps {
  senderName?: string;
}

export function TypingIndicator({ senderName }: TypingIndicatorProps) {
  return (
    <div className="flex gap-2 mb-3">
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
      {senderName && (
        <span className="text-xs text-gray-500 self-end">
          {senderName} is typing...
        </span>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

export default MessageBubble;
