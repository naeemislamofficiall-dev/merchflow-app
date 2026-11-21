"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Layers, ListFilter, RotateCcw, Scale, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";

const PAGE_SIZE = 10;

export type AqlRow = {
  id: string;
  inspectionNo: string;
  stage: string;
  lotSize: number;
  sampleSize: number;
  found: string;
  result: string;
  createdAt: string;
};

type Filters = { q: string; stage: string };
const EMPTY: Filters = { q: "", stage: "" };

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

export function AqlTable({ rows }: { rows: AqlRow[] }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const stages = [...new Set(rows.map((r) => r.stage))].sort();
  const q = applied.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!applied.stage || r.stage === applied.stage) &&
      (!q || `${r.inspectionNo} ${r.stage}`.toLowerCase().includes(q))
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

  const heads = ["AQL No", "Stage", "Lot", "Sample", "Found (C / Maj / Min)", "Result", "Created", "Actions"];

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <label className="space-y-1 text-sm">
          <span className="block font-semibold text-navy-800">Stage</span>
          <span className="relative block">
            <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            <select
              value={draft.stage}
              onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
              className={`${field} min-w-48 pl-10 capitalize`}
            >
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-semibold text-navy-800">Search</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              placeholder="Search AQL inspections..."
              className={`${field} min-w-64 pl-10`}
            />
          </span>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <ListFilter className="h-4 w-4" /> Filter
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

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        {total === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
                <Scale className="h-10 w-10" strokeWidth={2} />
              </span>
            </span>
            <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">
              {rows.length === 0 ? "No AQL Inspections Yet" : "No AQL Inspections Match"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {rows.length === 0 ? "Create a new AQL inspection to see it here." : "Try different filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy-800 text-white">
                  <tr>
                    {heads.map((h, i) => (
                      <th key={h} className={cn(th, (i === 2 || i === 3) && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className={`${td} whitespace-nowrap font-semibold`}>
                        <Link href={`/quality/aql/${r.id}`} className="text-blue-700 hover:underline">
                          {r.inspectionNo}
                        </Link>
                      </td>
                      <td className={`${td} capitalize`}>{r.stage}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.lotSize}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.sampleSize}</td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{r.found}</td>
                      <td className={td}>
                        <StatusBadge status={r.result} />
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{r.createdAt}</td>
                      <td className={td}>
                        <Link
                          href={`/quality/aql/${r.id}`}
                          aria-label={`View ${r.inspectionNo}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <span className="text-sm font-medium text-navy-800">
                Showing {from}–{to} of {total} AQL inspections
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
          </>
        )}
      </div>
    </div>
  );
}