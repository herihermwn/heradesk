import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import { ChatProvider, useChatStore } from "../../stores/chatStore";
import { ChatRoom } from "../../components/cs/ChatRoom";
import { ChatList } from "../../components/cs/ChatList";
import { getStoredToken } from "../../hooks/useAuth";

// ============================================
// SIDEBAR COMPONENT
// ============================================

interface SidebarProps {
  csStatus: "online" | "busy" | "offline";
  onStatusChange: (status: "online" | "busy" | "offline") => void;
}

function Sidebar({ csStatus, onStatusChange }: SidebarProps) {
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

      {/* Status Selector */}
      <div className="p-4 border-b">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Status
        </label>
        <select
          value={csStatus}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
            csStatus === "online"
              ? "border-green-300 bg-green-50 text-green-700"
              : csStatus === "busy"
              ? "border-yellow-300 bg-yellow-50 text-yellow-700"
              : "border-gray-300 bg-gray-50 text-gray-700"
          }`}
        >
          <option value="online">Online</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a
              href="/cs"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a
              href="/cs/history"
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Chat History</span>
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
// STATS CARD COMPONENT
// ============================================

interface StatsCardProps {
  label: string;
  value: string | number;
  color?: "primary" | "green" | "orange" | "gray";
}

function StatsCard({ label, value, color = "primary" }: StatsCardProps) {
  const colorClasses = {
    primary: "text-primary-600",
    green: "text-green-600",
    orange: "text-orange-500",
    gray: "text-gray-600",
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD CONTENT
// ============================================

function DashboardContent() {
  const store = useChatStore();
  const [activeTab, setActiveTab] = useState<"active" | "queue">("active");

  // Load initial data
  useEffect(() => {
    store.loadActiveChats();
    store.loadQueue();
    store.loadCsStatus();
    store.loadOnlineCS();
    store.loadStats();
    store.loadCannedResponses();
  }, []);

  // Handle status change
  const handleStatusChange = async (status: "online" | "busy" | "offline") => {
    await store.updateStatus(status);
  };

  // Get current status
  const currentStatus = store.csStatus?.state || "offline";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        csStatus={currentStatus}
        onStatusChange={handleStatusChange}
      />

      <main className="flex-1 flex flex-col p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Active Chats"
            value={`${store.csStatus?.activeChats || 0}/${
              store.csStatus?.maxChats || 5
            }`}
            color="primary"
          />
          <StatsCard
            label="In Queue"
            value={store.queue.length}
            color="orange"
          />
          <StatsCard
            label="Today's Chats"
            value={store.stats?.todayChats || 0}
            color="gray"
          />
          <StatsCard
            label="Resolved Today"
            value={store.stats?.resolvedToday || 0}
            color="green"
          />
        </div>

        {/* Error Alert */}
        {store.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{store.error}</span>
            <button
              onClick={() => {}}
              className="text-red-500 hover:text-red-700"
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
        )}

        {/* Main Content */}
        <div className="flex-1 flex gap-6">
          {/* Chat List Panel */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === "active"
                    ? "text-primary-600 border-b-2 border-primary-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Active ({store.activeChats.length})
              </button>
              <button
                onClick={() => setActiveTab("queue")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === "queue"
                    ? "text-primary-600 border-b-2 border-primary-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Queue ({store.queue.length})
              </button>
            </div>

            {/* Chat Lists */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "active" ? (
                <ChatList
                  title=""
                  chats={store.activeChats}
                  selectedChatId={store.selectedChatId}
                  onSelect={store.selectChat}
                  emptyMessage="No active chats"
                />
              ) : (
                <ChatList
                  title=""
                  chats={store.queue}
                  selectedChatId={store.selectedChatId}
                  onSelect={store.selectChat}
                  onAccept={store.acceptChat}
                  isQueue={true}
                  emptyMessage="No chats in queue"
                />
              )}
            </div>
          </div>

          {/* Chat Room */}
          <div className="flex-1">
            <ChatRoom
              chat={store.selectedChat}
              messages={store.messages}
              isLoading={store.isLoadingMessages}
              customerTyping={store.customerTyping}
              onSendMessage={store.sendMessage}
              onTyping={store.sendTyping}
              onResolve={(notes) => {
                if (store.selectedChatId) {
                  store.resolveChat(store.selectedChatId, notes);
                }
              }}
              onTransfer={(targetCsId) => {
                if (store.selectedChatId) {
                  store.transferChat(store.selectedChatId, targetCsId);
                }
              }}
              onAccept={() => {
                if (store.selectedChatId) {
                  store.acceptChat(store.selectedChatId);
                }
              }}
              onlineCS={store.onlineCS}
              cannedResponses={store.cannedResponses}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================
// APP WRAPPER WITH PROVIDER
// ============================================

function CsDashboard() {
  const token = getStoredToken();

  // Redirect to login if no token
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
    <ChatProvider token={token}>
      <DashboardContent />
    </ChatProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<CsDashboard />);
