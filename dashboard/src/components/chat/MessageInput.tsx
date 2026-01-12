import React, { useState, useRef, useEffect, useCallback } from "react";

// ============================================
// TYPES
// ============================================

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onAttach?: (file: File) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachButton?: boolean;
  autoFocus?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function MessageInput({
  onSend,
  onTyping,
  onAttach,
  placeholder = "Ketik pesan...",
  disabled = false,
  maxLength = 2000,
  showAttachButton = false,
  autoFocus = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle typing indicator
  const handleTypingStart = useCallback(() => {
    if (!isTyping && onTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (onTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 2000);
  }, [isTyping, onTyping]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      handleTypingStart();
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSend(trimmedMessage);
    setMessage("");

    // Stop typing indicator
    if (onTyping && isTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttach) {
      onAttach(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const remainingChars = maxLength - message.length;
  const showCharCount = remainingChars < 200;

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        {/* Attach button */}
        {showAttachButton && (
          <>
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Lampirkan file"
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
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
          </>
        )}

        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-2 pr-12 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
          />

          {/* Character count */}
          {showCharCount && (
            <span
              className={`absolute bottom-2 right-14 text-xs ${
                remainingChars < 50 ? "text-red-500" : "text-gray-400"
              }`}
            >
              {remainingChars}
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Kirim pesan"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// CANNED RESPONSE SELECTOR
// ============================================

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut?: string | null;
}

interface CannedResponseSelectorProps {
  responses: CannedResponse[];
  onSelect: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CannedResponseSelector({
  responses,
  onSelect,
  isOpen,
  onClose,
}: CannedResponseSelectorProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredResponses = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase()) ||
      r.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari balasan cepat..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          autoFocus
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-48">
        {filteredResponses.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Tidak ada balasan cepat
          </div>
        ) : (
          filteredResponses.map((response) => (
            <button
              key={response.id}
              onClick={() => {
                onSelect(response.content);
                onClose();
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900">
                  {response.title}
                </span>
                {response.shortcut && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    /{response.shortcut}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {response.content}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export default MessageInput;
