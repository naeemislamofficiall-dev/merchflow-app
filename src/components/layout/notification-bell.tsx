"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(app)/actions";
import { TypeIcon, timeAgo, typeBox } from "@/components/notifications/meta";
import { cn } from "@/lib/utils";

export type BellItem = {
  id: string;
  type?: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string; // ISO
};

// topbar-er ghonta: unread thakle lal dot, dropdown-e shesh 8 ta. "ekhon"-er somoy shudhu dropdown khulle neya hoy (hydration mismatch ere)
// server theke notun data ashle topbar.tsx-er key bodle component notun kore shuru hoy, tai sync effect lage na
export function NotificationBell({ unreadCount, items }: { unreadCount: number; items: BellItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(items);
  const [unread, setUnread] = useState(unreadCount);
  const [nowMs, setNowMs] = useState(0);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle() {
    setNowMs(Date.now());
    setOpen((o) => !o);
  }

  function openItem(n: BellItem) {
    setOpen(false);
    if (!n.read) {
      setList((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      start(async () => {
        await markNotificationReadAction(n.id);
      });
    }
    if (n.href) router.push(n.href);
  }

  function readAll() {
    setList((l) => l.map((x) => ({ ...x, read: true })));
    setUnread(0);
    start(async () => {
      await markAllNotificationsReadAction();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Notifications, ${unread} unread`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-navy-800 transition-colors hover:bg-muted"
      >
        <Bell className={cn("h-5 w-5 origin-top", unread > 0 && "motion-safe:animate-bell-ring")} />
        {unread > 0 && (
          <span className="absolute right-2.5 top-2 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-[22rem] overflow-hidden rounded-2xl border bg-card shadow-xl [animation:rise_0.2s_ease-out]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  {unread} new
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto p-1.5">
            {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing yet</li>}
            {list.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                    n.read ? "hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", typeBox(n.type))}>
                    <TypeIcon type={n.type} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm text-navy-800", !n.read && "font-semibold")}>{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {timeAgo(Date.parse(n.createdAt), nowMs)}
                    </span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50/60"
          >
            View all notifications <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}