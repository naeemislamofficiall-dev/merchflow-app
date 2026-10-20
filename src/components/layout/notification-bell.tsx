"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

export type BellItem = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string; // ISO
};

// টপবারের ঘণ্টা: অপঠিত সংখ্যা + সর্বশেষ ৮টি। ড্রপডাউন খুললেই শুধু তারিখ আঁকা হয় (hydration mismatch এড়াতে)
// সার্ভার থেকে নতুন ডাটা এলে topbar.tsx-এর key বদলে কম্পোনেন্ট নতুন করে শুরু হয়, তাই এখানে sync effect লাগে না
export function NotificationBell({ unreadCount, items }: { unreadCount: number; items: BellItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(items);
  const [unread, setUnread] = useState(unreadCount);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

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
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md border p-1.5 hover:bg-muted"
        aria-label={`Notifications, ${unread} unread`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-md border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-denim-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-96 overflow-y-auto">
            {list.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Nothing yet</li>}
            {list.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n)}
                  className={cn("block w-full border-b px-3 py-2 text-left hover:bg-muted", !n.read && "bg-denim-100/40")}
                >
                  <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-center text-sm text-denim-700 hover:bg-muted"
          >
            See all and preferences
          </Link>
        </div>
      )}
    </div>
  );
}