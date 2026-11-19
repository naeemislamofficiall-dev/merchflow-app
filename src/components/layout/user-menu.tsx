"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-muted"
      >
        <Avatar name={name} src={avatarUrl} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-navy-800">{name}</span>
          {role && <span className="block text-[11px] text-muted-foreground">{role}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border bg-card p-1.5 shadow-xl"
        >
          <div className="flex items-center gap-3 border-b px-3 pb-3 pt-2">
            <Avatar name={name} src={avatarUrl} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-800">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <Link
            href="/account/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <UserCog className="h-4 w-4 text-slate-500" /> Edit profile
          </Link>
          <Link
            href="/account/security"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <ShieldCheck className="h-4 w-4 text-slate-500" /> Security
          </Link>
        </div>
      )}
    </div>
  );
}