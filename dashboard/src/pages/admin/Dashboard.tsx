import React from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";

function AdminDashboard() {
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
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700"
              >
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Kelola User</span>
              </a>
            </li>
            <li>
              <a
                href="/admin/chats"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Log Chat</span>
              </a>
            </li>
            <li>
              <a
                href="/admin/reports"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Laporan</span>
              </a>
            </li>
            <li>
              <a
                href="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <span>Pengaturan</span>
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-500">Active Chats</p>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Waiting Queue</p>
            <p className="text-3xl font-bold text-orange-500">0</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Today's Chats</p>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Avg Rating</p>
            <p className="text-3xl font-bold text-green-600">-</p>
          </div>
        </div>

        {/* CS Status */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">CS Status</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm">
                <th className="pb-3">Nama</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Chats</th>
                <th className="pb-3">Avg Response</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-8">
                  Belum ada CS yang terdaftar
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Aktivitas Terbaru</h3>
          <div className="text-center text-gray-500 py-8">
            Belum ada aktivitas
          </div>
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<AdminDashboard />);
