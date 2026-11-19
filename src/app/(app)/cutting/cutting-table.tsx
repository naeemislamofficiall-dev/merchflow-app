"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, List, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";

const PAGE_SIZE = 10;

export type CutPlanRow = {
  id: string;
  cutPlanNo: string;
  productionNo: string;
  color: string;
  plannedPlies: number;
  plannedOutput: number;
  lays: string;
  status: string;
};

type Filters = { q: string; status: string; order: string; color: string };
const EMPTY: Filters = { q: "", status: "", order: "", color: "" };

// shudhu sajanor dot: naam chena hole rong, na chena hole dhushor
const DOT: Record<string, string> = {
  black: "#0f172a",
  white: "#ffffff",
  red: "#dc2626",
  blue: "#2563eb",
  "navy blue": "#1e3a8a",
  navy: "#1e3a8a",
  grey: "#9ca3af",
  gray: "#9ca3af",
  green: "#16a34a",
  yellow: "#facc15",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#9333ea",
  brown: "#92400e",
  beige: "#d6c7a1",
};

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

const uniq = (arr: string[]) => [...new Set(arr)].sort((a, b) => a.localeCompare(b));

export function CuttingTable({ rows }: { rows: CutPlanRow[] }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const statuses = uniq(rows.map((r) => r.status));
  const orders = uniq(rows.map((r) => r.productionNo));
  const colors = uniq(rows.map((r) => r.color));

  const q = applied.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!applied.status || r.status === applied.status) &&
      (!applied.order || r.productionNo === applied.order) &&
      (!applied.color || r.color === applied.color) &&
      (!q || `${r.cutPlanNo} ${r.productionNo} ${r.color}`.toLowerCase().includes(q))
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

  const apply = () => {
    setApplied(draft);
    setPage(1);
  };
  const reset = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  const heads = ["Cut Plan #", "Production Order", "Color", "Plies", "Output (pcs)", "Lays Cut", "Status", "Actions"];

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3 rounded-card border border-slate-100 bg-white p-4 shadow-card"
      >
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Search</span>
          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder="Cut plan, order, color"
            className={field}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Cut Plan Status</span>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={field}>
            <option value="">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Production Order</span>
          <select value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} className={field}>
            <option value="">All Orders</option>
            {orders.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Color</span>
          <select value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className={field}>
            <option value="">All Colors</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} /> Search
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <List className="h-5 w-5 text-navy-800" />
          <h2 className="font-heading text-lg font-semibold text-navy-800">Cut Plans</h2>
        </div>

        {total === 0 ? (
          <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No cut plans yet" : "No cut plans match these filters"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
                <tr>
                  {heads.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3.5 text-[15px] font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 text-[15px] font-medium text-navy-800">
                      <Link href={`/cutting/${r.id}`} className="hover:underline">
                        {r.cutPlanNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{r.productionNo}</td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: DOT[r.color.trim().toLowerCase()] ?? "#e2e8f0" }}
                        />
                        {r.color}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] tabular-nums text-navy-800">{r.plannedPlies}</td>
                    <td className="px-4 py-3.5 text-[15px] tabular-nums text-navy-800">
                      {r.plannedOutput.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3.5 text-[15px] tabular-nums text-navy-800">{r.lays}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/cutting/${r.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <span className="text-sm font-medium text-navy-800">
            Showing {from}–{to} of {total} cut plans
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
    </div>
  );
}