"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { BellItem } from "./notification-bell";
import type { NavGroupData } from "./nav-config";

export function AppShell({
  groups,
  companyName,
  companies,
  activeCompanyId,
  userEmail,
  unreadCount,
  notifications,
  children,
}: {
  groups: NavGroupData[];
  companyName: string;
  companies: { id: string; name: string }[];
  activeCompanyId: string;
  userEmail: string;
  unreadCount: number;
  notifications: BellItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar groups={groups} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenu={() => setOpen(true)}
          companyName={companyName}
          companies={companies}
          activeCompanyId={activeCompanyId}
          userEmail={userEmail}
          unreadCount={unreadCount}
          notifications={notifications}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}