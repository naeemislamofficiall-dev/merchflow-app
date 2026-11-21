"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid, ListFilter, Plus, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";

const PAGE_SIZE = 10;

export type CapaRow = {
  id: string;
  capaNo: string;
  title: string;
  category: string;
  dueDate: string;
  overdue: boolean;
  status: string;
};

type Filters = { q: string; category: string; status: string };
const EMPTY: Filters = { q: "", category: "", status: "" };

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

export function CapaTable({ rows }: { rows: CapaRow[] }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const statuses = [...new Set(rows.map((r) => r.status))].sort();

  const q = applied.q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!applied.category || r.category === applied.category) &&
      (!applied.status || r.status === applied.status) &&
      (!q || `${r.capaNo} ${r.title}`.toLowerCase().includes(q))
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

  const heads = ["CAPA No", "Title", "Category", "Due", "Status"];

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
        className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder="Search CAPAs..."
            className={field}
          />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-4">
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">Category</span>
            <span className="relative block">
              <LayoutGrid className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={field}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">Status</span>
            <span className="relative block">
              <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className={field}
              >
                <option value="">All status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <div className="flex gap-3">
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
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        {total === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
                <ShieldCheck className="h-10 w-10" strokeWidth={2} />
              </span>
            </span>
            <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">
              {rows.length === 0 ? "No CAPAs Yet" : "No CAPAs Match"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {rows.length === 0
                ? "Start creating a CAPA to address quality issues and prevent recurrence."
                : "Try different filters."}
            </p>
            {rows.length === 0 && (
              <Link
                href="/quality/capa/new"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Create CAPA
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy-800 text-white">
                  <tr>
                    {heads.map((h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className={`${td} whitespace-nowrap font-semibold`}>
                        <Link href={`/quality/capa/${r.id}`} className="text-blue-700 hover:underline">
                          {r.capaNo}
                        </Link>
                      </td>
                      <td className={td}>{r.title}</td>
                      <td className={td}>{r.category || "-"}</td>
                      <td className={cn(td, "whitespace-nowrap", r.overdue && "font-semibold text-red-600")}>
                        {r.dueDate || "-"}
                        {r.overdue ? " (late)" : ""}
                      </td>
                      <td className={td}>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <span className="text-sm font-medium text-navy-800">
                Showing {from}–{to} of {total} CAPAs
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