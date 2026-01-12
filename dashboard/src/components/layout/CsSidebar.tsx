import React from "react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface CsSidebarProps {
  currentPath?: string;
  onlineStatus?: "online" | "away" | "offline";
  onStatusChange?: (status: "online" | "away" | "offline") => void;
}

const links: SidebarLink[] = [
  {
    href: "/cs",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/cs/history",
    label: "Riwayat Chat",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-400",
};

const statusLabels = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

export function CsSidebar({ currentPath, onlineStatus = "offline", onStatusChange }: CsSidebarProps) {
  const activePath = currentPath || (typeof window !== "undefined" ? window.location.pathname : "/cs");

  const isActive = (href: string) => {
    if (href === "/cs") {
      return activePath === "/cs" || activePath === "/cs/";
    }
    return activePath.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary-600">HeraDesk</h1>
        <p className="text-sm text-gray-500">Customer Service</p>
      </div>

      {/* Status Selector */}
      {onStatusChange && (
        <div className="p-4 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex gap-2">
            {(["online", "away", "offline"] as const).map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  onlineStatus === status
                    ? "bg-gray-100 ring-2 ring-primary-500"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                <span className="hidden sm:inline">{statusLabels[status]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Status */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-3 h-3 rounded-full ${statusColors[onlineStatus]}`} />
          <span className="text-sm text-gray-600">
            Anda sedang <strong>{statusLabels[onlineStatus].toLowerCase()}</strong>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
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
