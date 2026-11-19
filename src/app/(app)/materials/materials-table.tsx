"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Inbox, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type MaterialRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  reorderPoint: string;
  status: string;
};

const PAGE_SIZE = 10;

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  ACTIVE: { label: "Active", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  INACTIVE: { label: "Inactive", pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
};
const nice = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
const stOf = (s: string) => ST[s] ?? { label: nice(s), pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
const uniq = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();

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
const SELECT =
  "h-11 w-full appearance-none rounded-lg border bg-card pl-4 pr-10 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

function FilterSelect({
  value,
  onChange,
  label,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  allLabel: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="relative w-full sm:w-44">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={SELECT}>
        <option value="ALL">{allLabel}</option>
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
    </div>
  );
}

export function MaterialsTable({ rows, canEdit }: { rows: MaterialRow[]; canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");
  const [unit, setUnit] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => uniq(rows.map((r) => r.category)).map((v) => [v, v] as const), [rows]);
  const units = useMemo(() => uniq(rows.map((r) => r.unit)).map((v) => [v, v] as const), [rows]);
  const statuses = useMemo(() => uniq(rows.map((r) => r.status)).map((v) => [v, stOf(v).label] as const), [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (category === "ALL" || r.category === category) &&
        (unit === "ALL" || r.unit === unit) &&
        (status === "ALL" || r.status === status) &&
        (!s || `${r.code} ${r.name}`.toLowerCase().includes(s))
    );
  }, [rows, q, category, unit, status]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  return (
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search materials..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <FilterSelect value={category} onChange={pick(setCategory)} label="Category filter" allLabel="All categories" options={categories} />
        <FilterSelect value={unit} onChange={pick(setUnit)} label="Unit filter" allLabel="All units" options={units} />
        <FilterSelect value={status} onChange={pick(setStatus)} label="Status filter" allLabel="All statuses" options={statuses} />
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Code</th>
              <th className={cn(TH, "text-left")}>Name</th>
              <th className={cn(TH, "text-left")}>Category</th>
              <th className={cn(TH, "text-left")}>Unit</th>
              <th className={cn(TH, "text-right")}>Reorder point</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${category}-${unit}-${status}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = stOf(r.status);
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.code}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/materials/${r.id}`}
                      className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.unit}</td>
                  <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.reorderPoint || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold",
                        S.pill
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                      {S.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      <Link
                        href={`/materials/${r.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" strokeWidth={2.5} />
                        View
                      </Link>
                      {canEdit && (
                        <Link
                          href={`/materials/${r.id}/edit`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            {rows.length === 0 ? "No materials yet" : "No materials match your filters"}
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