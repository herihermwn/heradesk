import React from "react";
import { AdminSidebar } from "./AdminSidebar";
import { CsSidebar } from "./CsSidebar";

interface PageLayoutProps {
  children: React.ReactNode;
  type: "admin" | "cs";
  currentPath?: string;
  csStatus?: "online" | "away" | "offline";
  onCsStatusChange?: (status: "online" | "away" | "offline") => void;
}

export function PageLayout({
  children,
  type,
  currentPath,
  csStatus,
  onCsStatusChange,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {type === "admin" ? (
        <AdminSidebar currentPath={currentPath} />
      ) : (
        <CsSidebar
          currentPath={currentPath}
          onlineStatus={csStatus}
          onStatusChange={onCsStatusChange}
        />
      )}
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}

// Admin page layout shortcut
interface AdminPageLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function AdminPageLayout({ children, currentPath }: AdminPageLayoutProps) {
  return (
    <PageLayout type="admin" currentPath={currentPath}>
      {children}
    </PageLayout>
  );
}

// CS page layout shortcut
interface CsPageLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  status?: "online" | "away" | "offline";
  onStatusChange?: (status: "online" | "away" | "offline") => void;
}

export function CsPageLayout({
  children,
  currentPath,
  status,
  onStatusChange,
}: CsPageLayoutProps) {
  return (
    <PageLayout
      type="cs"
      currentPath={currentPath}
      csStatus={status}
      onCsStatusChange={onStatusChange}
    >
      {children}
    </PageLayout>
  );
}
