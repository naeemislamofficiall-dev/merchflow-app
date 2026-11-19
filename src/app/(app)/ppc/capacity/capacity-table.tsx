"use client";

import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const n = (v: number) => v.toLocaleString("en-US");

export type CapacityRow = {
  bucket: string;
  lineId: string;
  code: string;
  availableMinutes: number;
  plannedMinutes: number;
  gapMinutes: number;
  loadPct: number | null;
  overloaded: boolean;
  missingData: boolean;
};

export function CapacityTable({
  title,
  bucketLabel,
  rows,
}: {
  title: string;
  bucketLabel: string;
  rows: CapacityRow[];
}) {
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, total);

  // 1, last, ar current-er pashe 1ta kore page dekhabo; majhe gap thakle "..."
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - current) <= 1
  );

  const heads = [bucketLabel, "Line", "Available (min)", "Planned (min)", "Gap (min)", "Load %"];

  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      <div className="flex items-center gap-2.5 bg-navy-800 px-5 py-3.5 text-white">
        <BarChart3 className="h-5 w-5 text-sky-300" />
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>

      {total === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">This factory has no active lines.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead className="bg-slate-100 text-navy-800">
              <tr>
                {heads.map((h) => (
                  <th key={h} className="px-4 py-3.5 text-[15px] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={`${r.bucket}|${r.lineId}`}
                  className={cn("border-t border-slate-100", r.overloaded && "bg-red-50")}
                >
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.bucket}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">
                    {r.code}
                    {r.missingData && <span className="ml-2 text-xs text-amber-700">no operators</span>}
                  </td>
                  <td className="px-4 py-3 text-[15px] tabular-nums text-navy-800">{n(r.availableMinutes)}</td>
                  <td className="px-4 py-3 text-[15px] tabular-nums text-navy-800">{n(r.plannedMinutes)}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-[15px] tabular-nums",
                      r.gapMinutes < 0 ? "font-semibold text-red-600" : "text-navy-800"
                    )}
                  >
                    {n(r.gapMinutes)}
                  </td>
                  <td className="px-4 py-3 text-[15px] tabular-nums text-navy-800">
                    {r.loadPct === null ? "-" : `${r.loadPct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <span className="text-sm font-medium text-navy-800">
          Showing {from}–{to} of {total} records
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