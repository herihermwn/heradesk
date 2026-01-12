import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Message, ChatSession, CsWithStatus, CannedResponse } from "../../types";
import { MessageBubble, TypingIndicator } from "../chat/MessageBubble";
import { MessageInput, CannedResponseSelector } from "../chat/MessageInput";

// ============================================
// TYPES
// ============================================

interface ChatRoomProps {
  chat: ChatSession | null;
  messages: Message[];
  isLoading?: boolean;
  customerTyping?: boolean;
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  onResolve: (notes?: string) => void;
  onTransfer: (targetCsId: string) => void;
  onAccept?: () => void;
  onlineCS?: CsWithStatus[];
  cannedResponses?: CannedResponse[];
}

interface ChatHeaderProps {
  chat: ChatSession;
  onResolve: () => void;
  onShowTransfer: () => void;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (targetCsId: string) => void;
  onlineCS: CsWithStatus[];
}

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (notes?: string) => void;
}

// ============================================
// CHAT HEADER COMPONENT
// ============================================

function ChatHeader({ chat, onResolve, onShowTransfer }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-primary-600 font-semibold">
            {(chat.customerName || "Guest")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">
            {chat.customerName || "Guest"}
          </h3>
          {chat.customerEmail && (
            <p className="text-sm text-gray-500">{chat.customerEmail}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onShowTransfer}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Transfer
        </button>
        <button
          onClick={onResolve}
          className="px-3 py-1.5 text-sm bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors"
        >
          Selesaikan
        </button>
      </div>
    </div>
  );
}

// ============================================
// TRANSFER MODAL COMPONENT
// ============================================

function TransferModal({ isOpen, onClose, onTransfer, onlineCS }: TransferModalProps) {
  const [selectedCs, setSelectedCs] = useState<string>("");

  if (!isOpen) return null;

  const availableCS = onlineCS.filter((cs) => cs.status?.state === "online");

  const handleTransfer = () => {
    if (selectedCs) {
      onTransfer(selectedCs);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Transfer Chat</h3>
        </div>

        <div className="p-4">
          {availableCS.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Tidak ada CS lain yang tersedia saat ini
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                Pilih CS untuk menerima chat ini:
              </p>
              {availableCS.map((cs) => (
                <label
                  key={cs.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCs === cs.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="transfer-cs"
                    value={cs.id}
                    checked={selectedCs === cs.id}
                    onChange={(e) => setSelectedCs(e.target.value)}
                    className="sr-only"
                  />
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {cs.avatarUrl ? (
                      <img
                        src={cs.avatarUrl}
                        alt={cs.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-semibold">
                        {cs.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{cs.name}</p>
                    <p className="text-sm text-gray-500">
                      {cs.status?.activeChats || 0}/{cs.status?.maxChats || 5} chat aktif
                    </p>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      cs.status?.state === "online"
                        ? "bg-green-500"
                        : cs.status?.state === "busy"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedCs}
            className="px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RESOLVE MODAL COMPONENT
// ============================================

function ResolveModal({ isOpen, onClose, onResolve }: ResolveModalProps) {
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleResolve = () => {
    onResolve(notes || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Selesaikan Chat</h3>
        </div>

        <div className="p-4">
          <p className="text-gray-600 mb-3">
            Apakah Anda yakin ingin menyelesaikan chat ini?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan untuk chat ini..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors"
          >
            Selesaikan
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE LIST COMPONENT
// ============================================

interface MessageListProps {
  messages: Message[];
  customerTyping?: boolean;
  customerName?: string;
}

function MessageList({ messages, customerTyping, customerName }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, customerTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderType === "cs"}
          showAvatar={message.senderType === "customer"}
          senderName={
            message.senderType === "customer"
              ? customerName || "Guest"
              : message.senderType === "system"
              ? "System"
              : undefined
          }
        />
      ))}

      {customerTyping && (
        <div className="flex items-end gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-gray-600 text-sm font-medium">
              {(customerName || "G")[0].toUpperCase()}
            </span>
          </div>
          <TypingIndicator />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-lg font-medium text-gray-700 mb-1">
          Pilih Chat
        </h3>
        <p className="text-gray-500">
          Pilih chat dari daftar untuk memulai percakapan
        </p>
      </div>
    </div>
  );
}

// ============================================
// LOADING STATE COMPONENT
// ============================================

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">Memuat chat...</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN CHAT ROOM COMPONENT
// ============================================

export function ChatRoom({
  chat,
  messages,
  isLoading = false,
  customerTyping = false,
  onSendMessage,
  onTyping,
  onResolve,
  onTransfer,
  onAccept,
  onlineCS = [],
  cannedResponses = [],
}: ChatRoomProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);

  // Handle canned response selection
  const handleCannedResponseSelect = useCallback((content: string) => {
    onSendMessage(content);
    setShowCannedResponses(false);
  }, [onSendMessage]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!chat) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <ChatHeader
        chat={chat}
        onResolve={() => setShowResolveModal(true)}
        onShowTransfer={() => setShowTransferModal(true)}
      />

      <MessageList
        messages={messages}
        customerTyping={customerTyping}
        customerName={chat.customerName || undefined}
      />

      {/* Show Accept button for waiting chats, Message input for active chats */}
      {chat.status === "waiting" ? (
        <div className="p-4 border-t bg-orange-50">
          <div className="text-center">
            <p className="text-sm text-orange-700 mb-3">
              Chat ini masih dalam antrian. Terima chat untuk mulai membalas.
            </p>
            {onAccept && (
              <button
                onClick={onAccept}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Terima Chat
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="p-4 pb-2">
            <button
              onClick={() => setShowCannedResponses(!showCannedResponses)}
              className={`p-2 rounded-lg transition-colors ${
                showCannedResponses
                  ? "bg-primary-100 text-primary-600"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              title="Quick Replies"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>
          </div>

          <CannedResponseSelector
            responses={cannedResponses}
            onSelect={handleCannedResponseSelect}
            isOpen={showCannedResponses}
            onClose={() => setShowCannedResponses(false)}
          />

          <MessageInput
            onSend={onSendMessage}
            onTyping={onTyping}
            placeholder="Ketik pesan..."
          />
        </div>
      )}

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={onTransfer}
        onlineCS={onlineCS}
      />

      <ResolveModal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        onResolve={onResolve}
      />
    </div>
  );
}

export default ChatRoom;
