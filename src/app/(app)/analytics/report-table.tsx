"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

export type ReportCol = { key: string; label: string; right?: boolean };

export function ReportTable({
  columns,
  rows,
}: {
  columns: ReportCol[];
  rows: Record<string, string>[];
}) {
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, total);

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - current) <= 1
  );

  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      <div className="flex items-center gap-2.5 bg-navy-800 px-5 py-3.5 text-white">
        <List className="h-5 w-5 text-sky-300" />
        <h2 className="font-heading text-lg font-semibold">Report Details</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-navy-800">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide",
                    c.right && "text-right"
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                  No data for this report
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={start + i} className="border-t border-slate-100">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 text-[15px] text-navy-800", c.right && "text-right tabular-nums")}
                    >
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <span className="text-sm font-medium text-navy-800">
            Showing {from}–{to} of {total} results
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
      )}
    </div>
  );
}