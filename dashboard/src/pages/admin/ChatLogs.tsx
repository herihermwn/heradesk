import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import { AdminProvider, useAdminStore } from "../../stores/adminStore";
import { getStoredToken } from "../../hooks/useAuth";
import type { ChatSession, Message } from "../../types";

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
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a
              href="/admin/users"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Kelola User</span>
            </a>
          </li>
          <li>
            <a
              href="/admin/chats"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Log Chat</span>
            </a>
          </li>
          <li>
            <a
              href="/admin/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Pengaturan</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-700",
    active: "bg-blue-100 text-blue-700",
    resolved: "bg-green-100 text-green-700",
    abandoned: "bg-gray-100 text-gray-700",
  };

  const labels: Record<string, string> = {
    waiting: "Menunggu",
    active: "Aktif",
    resolved: "Selesai",
    abandoned: "Ditinggalkan",
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.waiting}`}>
      {labels[status] || status}
    </span>
  );
}

// ============================================
// RATING DISPLAY COMPONENT
// ============================================

function RatingDisplay({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <span className="text-gray-400">-</span>;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ============================================
// CHAT DETAIL MODAL
// ============================================

interface ChatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession | null;
}

function ChatDetailModal({ isOpen, onClose, chat }: ChatDetailModalProps) {
  if (!isOpen || !chat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Detail Chat</h3>
            <p className="text-sm text-gray-500">
              {chat.customerName || "Guest"} - {chat.customerEmail || "No email"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Info */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <StatusBadge status={chat.status} />
          </div>
          <div>
            <span className="text-gray-500">Rating:</span>{" "}
            <RatingDisplay rating={chat.rating} />
          </div>
          <div>
            <span className="text-gray-500">CS:</span>{" "}
            <span className="font-medium">{chat.cs?.name || "-"}</span>
          </div>
          <div>
            <span className="text-gray-500">Dibuat:</span>{" "}
            <span>{new Date(chat.createdAt).toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chat.messages && chat.messages.length > 0 ? (
            chat.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === "cs" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.senderType === "cs"
                      ? "bg-primary-500 text-white"
                      : message.senderType === "system"
                      ? "bg-gray-200 text-gray-600 text-center text-sm"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderType === "cs" ? "text-primary-100" : "text-gray-400"
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              Tidak ada pesan
            </div>
          )}
        </div>

        {/* Feedback */}
        {chat.ratingFeedback && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Feedback:</p>
            <p className="text-gray-700 italic">"{chat.ratingFeedback}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CHAT LOGS CONTENT
// ============================================

function ChatLogsContent() {
  const store = useAdminStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    store.loadChats(1, statusFilter === "all" ? undefined : statusFilter);
  }, [statusFilter]);

  const handleViewChat = async (chat: ChatSession) => {
    // In real implementation, fetch chat with messages
    setSelectedChat(chat);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Log Chat</h2>
          <p className="text-gray-500">Lihat semua riwayat percakapan</p>
        </div>

        {/* Error Alert */}
        {store.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{store.error}</span>
            <button onClick={store.clearError} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          {["all", "waiting", "active", "resolved", "abandoned"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-primary-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border"
              }`}
            >
              {status === "all" ? "Semua" :
               status === "waiting" ? "Menunggu" :
               status === "active" ? "Aktif" :
               status === "resolved" ? "Selesai" : "Ditinggalkan"}
            </button>
          ))}
        </div>

        {/* Chat Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {store.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : store.chats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Tidak ada chat yang ditemukan
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">CS</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Rating</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Waktu</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {store.chats.map((chat) => (
                  <tr key={chat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {chat.customerName || "Guest"}
                        </p>
                        {chat.customerEmail && (
                          <p className="text-sm text-gray-500">{chat.customerEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {chat.cs?.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={chat.status} />
                    </td>
                    <td className="px-6 py-4">
                      <RatingDisplay rating={chat.rating} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(chat.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewChat(chat)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - TODO */}
        {store.chatsTotal > 20 && (
          <div className="mt-4 flex justify-center gap-2">
            {/* Pagination buttons would go here */}
          </div>
        )}

        {/* Detail Modal */}
        <ChatDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedChat(null);
          }}
          chat={selectedChat}
        />
      </main>
    </div>
  );
}

// ============================================
// APP WRAPPER
// ============================================

function AdminChatLogsPage() {
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
    }
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminProvider token={token}>
      <ChatLogsContent />
    </AdminProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<AdminChatLogsPage />);
