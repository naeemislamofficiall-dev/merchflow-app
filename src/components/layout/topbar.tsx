"use client";

import { Building2, LogOut, Menu } from "lucide-react";
import { logoutAction, switchCompanyAction } from "@/app/(app)/actions";

export function Topbar({
  onMenu,
  companyName,
  companies,
  activeCompanyId,
  userEmail,
}: {
  onMenu: () => void;
  companyName: string;
  companies: { id: string; name: string }[];
  activeCompanyId: string;
  userEmail: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4">
      <button onClick={onMenu} className="md:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {companies.length > 1 ? (
          <form action={switchCompanyAction}>
            <select
              name="companyId"
              defaultValue={activeCompanyId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border bg-card px-2 py-1 text-sm"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </form>
        ) : (
          <span className="font-medium">{companyName}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
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