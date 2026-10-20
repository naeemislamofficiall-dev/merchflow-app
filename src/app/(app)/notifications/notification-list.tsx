"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [, start] = useTransition();
  const unread = list.filter((n) => !n.read).length;

  function open(n: Item) {
    if (!n.read) {
      setList((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      start(async () => {
        await markNotificationReadAction(n.id);
      });
    }
    if (n.href) router.push(n.href);
  }

  function readAll() {
    setList((l) => l.map((x) => ({ ...x, read: true })));
    start(async () => {
      await markAllNotificationsReadAction();
    });
  }

  return (
    <div>
      {unread > 0 && (
        <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <span className="text-muted-foreground">{unread} unread</span>
          <button onClick={readAll} className="text-denim-700 hover:underline">
            Mark all read
          </button>
        </div>
      )}
      {list.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
      ) : (
        <ul>
          {list.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => open(n)}
                className={cn("block w-full border-b px-4 py-2.5 text-left hover:bg-muted", !n.read && "bg-denim-100/40")}
              >
                <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}