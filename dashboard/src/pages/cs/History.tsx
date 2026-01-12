import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import type { ChatSession, Message } from "../../types";
import { csApi } from "../../services/api";

// ============================================
// TYPES
// ============================================

interface HistoryState {
  chats: ChatSession[];
  selectedChat: ChatSession | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

// ============================================
// CHAT DETAIL MODAL
// ============================================

interface ChatDetailModalProps {
  chat: ChatSession | null;
  onClose: () => void;
}

function ChatDetailModal({ chat, onClose }: ChatDetailModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (chat) {
      loadMessages();
    }
  }, [chat]);

  const loadMessages = async () => {
    if (!chat) return;
    setIsLoading(true);
    try {
      const response = await csApi.getChatDetail(chat.id);
      if (response.success && response.data) {
        setMessages(response.data.session.messages || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!chat) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {chat.customerName || "Guest"}
            </h3>
            <p className="text-sm text-gray-500">
              {chat.customerEmail || "No email"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Chat Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tanggal</p>
              <p className="font-medium">{formatDate(chat.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  chat.status === "resolved"
                    ? "bg-green-100 text-green-700"
                    : chat.status === "abandoned"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {chat.status === "resolved"
                  ? "Selesai"
                  : chat.status === "abandoned"
                  ? "Ditinggalkan"
                  : chat.status}
              </span>
            </div>
            <div>
              <p className="text-gray-500">Rating</p>
              {chat.rating ? (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= chat.rating!
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Belum dinilai</p>
              )}
            </div>
          </div>
          {chat.ratingFeedback && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-gray-500 text-sm">Feedback</p>
              <p className="text-sm mt-1">{chat.ratingFeedback}</p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Tidak ada pesan dalam chat ini
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderType === "cs" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.senderType === "cs"
                      ? "bg-primary-500 text-white"
                      : message.senderType === "system"
                      ? "bg-gray-100 text-gray-600 text-sm italic"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.senderType === "cs"
                        ? "text-primary-200"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HISTORY TABLE ROW
// ============================================

interface HistoryRowProps {
  chat: ChatSession;
  onClick: () => void;
}

function HistoryRow({ chat, onClick }: HistoryRowProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {(chat.customerName || "G")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-800">
              {chat.customerName || "Guest"}
            </p>
            <p className="text-sm text-gray-500">
              {chat.customerEmail || "No email"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-gray-800">{formatDate(chat.createdAt)}</p>
        <p className="text-sm text-gray-500">{formatTime(chat.createdAt)}</p>
      </td>
      <td className="px-4 py-3">
        {chat.resolvedAt ? (
          <>
            <p className="text-gray-800">{formatDate(chat.resolvedAt)}</p>
            <p className="text-sm text-gray-500">
              {formatTime(chat.resolvedAt)}
            </p>
          </>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            chat.status === "resolved"
              ? "bg-green-100 text-green-700"
              : chat.status === "abandoned"
              ? "bg-gray-100 text-gray-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {chat.status === "resolved"
            ? "Selesai"
            : chat.status === "abandoned"
            ? "Ditinggalkan"
            : chat.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {chat.rating ? (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-4 h-4 ${
                  star <= chat.rating! ? "text-yellow-400" : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-gray-600">{chat._count?.messages || 0}</span>
      </td>
    </tr>
  );
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

function Sidebar() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary-600">HeraDesk</h1>
        <p className="text-sm text-gray-500">CS Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a
              href="/cs"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a
              href="/cs/history"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700"
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Riwayat Chat</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
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
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ============================================
// MAIN HISTORY PAGE COMPONENT
// ============================================

function CsHistoryPage() {
  const [state, setState] = useState<HistoryState>({
    chats: [],
    selectedChat: null,
    isLoading: false,
    error: null,
    page: 1,
    hasMore: true,
  });

  const loadHistory = useCallback(async (page: number = 1) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await csApi.getHistory({ page, limit: 20 });
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          chats: page === 1 ? response.data! : [...prev.chats, ...response.data!],
          hasMore: response.data!.length === 20,
          page,
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Gagal memuat riwayat chat",
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadMore = () => {
    if (!state.isLoading && state.hasMore) {
      loadHistory(state.page + 1);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Riwayat Chat</h2>
          <p className="text-gray-500">
            Lihat semua chat yang telah selesai atau ditinggalkan
          </p>
        </div>

        {state.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {state.error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Mulai
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Selesai
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Pesan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {state.chats.length === 0 && !state.isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Belum ada riwayat chat
                    </td>
                  </tr>
                ) : (
                  state.chats.map((chat) => (
                    <HistoryRow
                      key={chat.id}
                      chat={chat}
                      onClick={() =>
                        setState((prev) => ({ ...prev, selectedChat: chat }))
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {state.hasMore && (
            <div className="p-4 border-t flex justify-center">
              <button
                onClick={loadMore}
                disabled={state.isLoading}
                className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {state.isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Memuat...
                  </span>
                ) : (
                  "Muat lebih banyak"
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      <ChatDetailModal
        chat={state.selectedChat}
        onClose={() => setState((prev) => ({ ...prev, selectedChat: null }))}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<CsHistoryPage />);
