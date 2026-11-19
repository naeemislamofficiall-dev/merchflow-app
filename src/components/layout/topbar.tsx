"use client";

import { Building2, ChevronDown, LogOut, Menu } from "lucide-react";
import { logoutAction, switchCompanyAction } from "@/app/(app)/actions";
import { SearchBox } from "./search-box";
import { NotificationBell, type BellItem } from "./notification-bell";
import { UserMenu } from "./user-menu";

export function Topbar({
  onMenu,
  companyName,
  companies,
  activeCompanyId,
  userEmail,
  userName,
  userRole,
  avatarUrl,
  unreadCount,
  notifications,
}: {
  onMenu: () => void;
  companyName: string;
  companies: { id: string; name: string }[];
  activeCompanyId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  unreadCount: number;
  notifications: BellItem[];
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4">
      <button onClick={onMenu} className="md:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm shadow-card">
        <Building2 className="h-4 w-4 text-navy-800" />
        {companies.length > 1 ? (
          <form action={switchCompanyAction} className="flex items-center gap-1">
            <select
              name="companyId"
              defaultValue={activeCompanyId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="cursor-pointer appearance-none bg-transparent pr-1 text-sm font-semibold text-navy-800 outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </form>
        ) : (
          <span className="font-semibold text-navy-800">{companyName}</span>
        )}
      </div>

      <SearchBox />

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell
          key={`${unreadCount}:${notifications.map((n) => `${n.id}${n.read ? 1 : 0}`).join(",")}`}
          unreadCount={unreadCount}
          items={notifications}
        />
        <UserMenu name={userName} email={userEmail} role={userRole} avatarUrl={avatarUrl} />
        <form action={logoutAction}>
          <button className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}