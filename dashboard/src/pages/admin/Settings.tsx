import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import { AdminProvider, useAdminStore } from "../../stores/adminStore";
import { getStoredToken } from "../../hooks/useAuth";

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
              <span>Manage Users</span>
            </a>
          </li>
          <li>
            <a
              href="/admin/chats"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
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
// SETTINGS CONTENT
// ============================================

function SettingsContent() {
  const store = useAdminStore();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    maxChatsPerCs: 5,
    autoAssignment: true,
    businessHoursEnabled: false,
    businessHoursStart: "08:00",
    businessHoursEnd: "17:00",
    offlineMessage: "Thank you for contacting us. We are currently offline. Please leave a message and we will get back to you soon.",
    welcomeMessage: "Hello! Welcome to our service. How can we help you?",
  });

  useEffect(() => {
    store.loadSettings();
  }, []);

  useEffect(() => {
    if (store.settings && Object.keys(store.settings).length > 0) {
      setSettings(store.settings as typeof settings);
    }
  }, [store.settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);

    const success = await store.updateSettings(settings);

    setIsSaving(false);
    if (success) {
      setSuccessMessage("Settings saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <p className="text-gray-500">HeraDesk system configuration</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

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

        <div className="space-y-6">
          {/* Chat Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Chat Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Chats per CS
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxChatsPerCs}
                  onChange={(e) => setSettings({ ...settings, maxChatsPerCs: parseInt(e.target.value) || 5 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of concurrent chats a CS agent can handle
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Auto Assignment
                  </label>
                  <p className="text-sm text-gray-500">
                    Automatically assign chats to available CS agents
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoAssignment: !settings.autoAssignment })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoAssignment ? "bg-primary-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoAssignment ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Hours</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Enable Business Hours
                  </label>
                  <p className="text-sm text-gray-500">
                    Limit chat service to business hours
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, businessHoursEnabled: !settings.businessHoursEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.businessHoursEnabled ? "bg-primary-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.businessHoursEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {settings.businessHoursEnabled && (
                <div className="flex gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={settings.businessHoursStart}
                      onChange={(e) => setSettings({ ...settings, businessHoursStart: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={settings.businessHoursEnd}
                      onChange={(e) => setSettings({ ...settings, businessHoursEnd: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Automated Messages</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Message displayed when customer starts a chat..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offline Message
                </label>
                <textarea
                  value={settings.offlineMessage}
                  onChange={(e) => setSettings({ ...settings, offlineMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Message displayed when no CS agents are online..."
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================
// APP WRAPPER
// ============================================

function AdminSettingsPage() {
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
      <SettingsContent />
    </AdminProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<AdminSettingsPage />);
