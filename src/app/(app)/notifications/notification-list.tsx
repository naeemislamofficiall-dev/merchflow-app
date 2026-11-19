"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronRight, Inbox } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(app)/actions";
import { TypeIcon, timeAgo, typeBox } from "@/components/notifications/meta";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const TZ = "Asia/Dhaka";
const DAY = 86_400_000;
const PAGE = 15;
const dayKey = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });

export function NotificationList({ items, nowIso }: { items: Item[]; nowIso: string }) {
  const router = useRouter();
  const nowMs = Date.parse(nowIso);
  const [list, setList] = useState(items);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [shown, setShown] = useState(PAGE);
  const [, start] = useTransition();

  const unread = list.filter((n) => !n.read).length;
  const visible = tab === "unread" ? list.filter((n) => !n.read) : list;
  const rows = visible.slice(0, shown);

  // Today / Yesterday / Earlier bhag
  const todayKey = dayKey(nowMs);
  const yesterdayKey = dayKey(nowMs - DAY);
  const groups: { label: string; items: Item[] }[] = [];
  for (const n of rows) {
    const k = dayKey(Date.parse(n.createdAt));
    const label = k === todayKey ? "Today" : k === yesterdayKey ? "Yesterday" : "Earlier";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { k: "all", label: `All (${list.length})` },
              { k: "unread", label: `Unread (${unread})` },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => {
                setTab(t.k);
                setShown(PAGE);
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.k
                  ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={readAll}
          disabled={unread === 0}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-500">
          <Inbox className="h-9 w-9 animate-float text-slate-300" />
          {tab === "unread" ? "You're all caught up" : "No notifications yet"}
        </div>
      ) : (
        <div key={tab} className="space-y-4">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</h3>
              <ul className="stagger stagger-fast space-y-1">
                {g.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        n.read ? "hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50"
                      )}
                    >
                      <span
                        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", typeBox(n.type))}
                      >
                        <TypeIcon type={n.type} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm text-navy-800", !n.read && "font-semibold")}>{n.title}</span>
                        <span className="line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                        <span
                          className="mt-0.5 block text-[11px] text-slate-400"
                          title={new Date(n.createdAt).toLocaleString("en-GB", { timeZone: TZ })}
                        >
                          {timeAgo(Date.parse(n.createdAt), nowMs)}
                        </span>
                      </span>
                      {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {visible.length > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE)}
              className="w-full rounded-xl border-2 border-dashed border-blue-200 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Show more ({visible.length - shown} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}