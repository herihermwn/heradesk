import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";

type ChatSession = {
  id: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
};

function CsDashboard() {
  const [status, setStatus] = useState<"online" | "offline" | "busy">("offline");
  const [activeChats] = useState<ChatSession[]>([]);
  const [waitingQueue] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700"
              >
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a
                href="/cs/history"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Riwayat Chat</span>
              </a>
            </li>
            <li>
              <a
                href="/cs/responses"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Quick Replies</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="input w-32"
            >
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-500">Active Chats</p>
            <p className="text-3xl font-bold text-primary-600">
              {activeChats.length}/5
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Waiting Queue</p>
            <p className="text-3xl font-bold text-orange-500">
              {waitingQueue.length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Today's Resolved</p>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
        </div>

        {/* Queue */}
        {waitingQueue.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Waiting Queue</h3>
            <div className="grid grid-cols-3 gap-4">
              {waitingQueue.map((chat) => (
                <div key={chat.id} className="card">
                  <p className="font-medium">{chat.customerName}</p>
                  <p className="text-sm text-gray-500">{chat.lastMessageAt}</p>
                  <button className="btn btn-primary mt-3 w-full">Accept</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Chats */}
        <div className="grid grid-cols-3 gap-6">
          {/* Chat List */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-3">Active Chats</h3>
            <div className="space-y-2">
              {activeChats.length === 0 ? (
                <p className="text-gray-500 text-sm">Tidak ada chat aktif</p>
              ) : (
                activeChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedChat === chat.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium">{chat.customerName}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat View */}
          <div className="col-span-2">
            {selectedChat ? (
              <div className="card h-96 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {/* Messages would go here */}
                </div>
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Ketik pesan..."
                  />
                  <button className="btn btn-primary">Kirim</button>
                </div>
              </div>
            ) : (
              <div className="card h-96 flex items-center justify-center text-gray-500">
                Pilih chat untuk memulai percakapan
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<CsDashboard />);
