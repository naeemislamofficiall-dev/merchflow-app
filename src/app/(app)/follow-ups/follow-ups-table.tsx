"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { RowActions } from "./follow-up-controls";

export type FollowRow = {
  id: string;
  poId: string;
  poNo: string;
  supplier: string;
  firstPromise: string;
  latestPromise: string;
  delayDays: number;
  escalated: boolean;
  escalationNote: string;
  lastContact: string;
};

const PAGE_SIZE = 10;

const TABS = [
  { v: "all", label: "All" },
  { v: "late", label: "Late" },
  { v: "escalated", label: "Escalated" },
] as const;

function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

export function FollowUpsTable({ rows }: { rows: FollowRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["v"]>("all");
  const [page, setPage] = useState(1);

  const list = useMemo(
    () =>
      rows.filter((r) => (tab === "all" ? true : tab === "late" ? r.delayDays > 0 : r.escalated)),
    [rows, tab]
  );

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          Follow-up List
        </h2>
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => {
                setTab(t.v);
                setPage(1);
              }}
              aria-pressed={tab === t.v}
              className={cn(
                "h-9 rounded-lg px-4 text-sm font-semibold transition-colors",
                tab === t.v ? "bg-blue-600 text-white" : "text-navy-800 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>PO</th>
              <th className={cn(TH, "text-left")}>Supplier</th>
              <th className={cn(TH, "text-left")}>First promise</th>
              <th className={cn(TH, "text-left")}>Latest promise</th>
              <th className={cn(TH, "text-left")}>Delay</th>
              <th className={cn(TH, "text-left")}>Last contact</th>
              <th className={cn(TH, "rounded-r-lg text-left")}>Actions</th>
            </tr>
          </thead>
          <tbody key={`${tab}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/purchase-orders/${r.poId}`}
                    className="text-[15px] font-semibold text-blue-600 hover:underline"
                  >
                    {r.poNo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[15px] text-navy-800">{r.supplier}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.firstPromise}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.latestPromise}</td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {r.delayDays > 0 ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600">
                        <Clock className="h-3.5 w-3.5" />
                        {r.delayDays} {r.delayDays === 1 ? "day" : "days"} late
                      </span>
                    ) : (
                      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        On time
                      </span>
                    )}
                    {r.escalated && (
                      <span
                        title={r.escalationNote}
                        className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700"
                      >
                        Escalated
                      </span>
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.lastContact || "-"}</td>
                <td className="px-4 py-3">
                  <RowActions id={r.id} latest={r.latestPromise} escalated={r.escalated} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            {rows.length === 0
              ? "No open follow-ups. A follow-up is created when a PO is sent to the supplier"
              : "No follow-ups in this view"}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} results
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={cur === 1}
              onClick={() => setPage(cur - 1)}
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageList(cur, pages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === cur ? "page" : undefined}
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium",
                    p === cur ? "border-blue-600 bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={cur === pages}
              onClick={() => setPage(cur + 1)}
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}