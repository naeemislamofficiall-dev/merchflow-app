"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Filter, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";

const PAGE_SIZE = 10;
const n = (v: number) => v.toLocaleString("en-US");

export type WipRow = {
  id: string;
  productionNo: string;
  orderNo: string;
  styleNo: string;
  status: string;
  planned: number;
  cut: number;
  sewn: number;
  finished: number;
  packed: number;
  shipped: number;
  inSewing: number;
  inFinishing: number;
};

type Filters = { q: string; status: string };
const EMPTY: Filters = { q: "", status: "" };

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

export function WipTable({ rows }: { rows: WipRow[] }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const statuses = [...new Set(rows.map((r) => r.status))].sort();
  const q = applied.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!applied.status || r.status === applied.status) &&
      (!q || `${r.productionNo} ${r.orderNo} ${r.styleNo}`.toLowerCase().includes(q))
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, total);

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - current) <= 1
  );

  const heads = [
    "Production Order",
    "Order / Style",
    "Status",
    "Planned",
    "Cut",
    "Sewn",
    "Finished",
    "Packed",
    "Shipped",
    "In Sewing",
    "In Finishing",
  ];

  return (
    <div className="rounded-card border border-slate-100 bg-white shadow-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
        className="flex flex-wrap items-end gap-4 p-5"
      >
        <span className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-navy-800">
          <Filter className="h-4 w-4" /> Filters
        </span>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Search</span>
          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder="Production no, order, style"
            className={`${field} min-w-64`}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Status</span>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className={`${field} min-w-44`}
          >
            <option value="">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> Show
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY);
            setApplied(EMPTY);
            setPage(1);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </form>

      {total === 0 ? (
        <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No running production orders" : "No production orders match these filters"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-navy-800">
              <tr>
                {heads.map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide",
                      i >= 3 && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-3.5 text-[15px] font-semibold">
                    <Link
                      href={`/production-orders/${r.id}`}
                      className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                    >
                      <FileText className="h-4 w-4 text-blue-400" /> {r.productionNo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[15px] text-navy-800">
                    {r.orderNo} / {r.styleNo}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                  {[r.planned, r.cut, r.sewn, r.finished, r.packed, r.shipped, r.inSewing, r.inFinishing].map(
                    (v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-4 py-3.5 text-right text-[15px] tabular-nums",
                          v < 0 ? "font-semibold text-red-600" : "text-navy-800"
                        )}
                      >
                        {n(v)}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <span className="text-sm font-medium text-navy-800">
          Showing {from}–{to} of {total} entries
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pages.map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              {i > 0 && p - pages[i - 1] > 1 && <span className="text-slate-400">…</span>}
              <button
                type="button"
                aria-current={p === current ? "page" : undefined}
                onClick={() => setPage(p)}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold",
                  p === current
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-navy-800 hover:bg-slate-50"
                )}
              >
                {p}
              </button>
            </span>
          ))}
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}