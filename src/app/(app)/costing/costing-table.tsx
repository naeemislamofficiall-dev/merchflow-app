"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Inbox, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SheetRow = {
  id: string;
  styleNo: string;
  styleName: string;
  version: string;
  type: string;
  currency: string;
  totalCost: string;
  margin: string;
  quotedPrice: string;
  status: string;
};

const PAGE_SIZE = 10;

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  DRAFT: { label: "Draft", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  SUBMITTED: { label: "Submitted", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  APPROVED: { label: "Approved", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
};
const STATUS_OPTIONS = Object.entries(ST).map(([k, v]) => [k, v.label] as const);

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

// Empty state-er halka illustration (shudhu sajano, kono data na)
function EmptyArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-32 w-44" aria-hidden="true">
      <ellipse cx="80" cy="64" rx="66" ry="44" fill="#eff6ff" />
      <rect x="40" y="14" width="64" height="82" rx="6" fill="#fff" stroke="#93c5fd" strokeWidth="2" />
      <g stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round">
        <path d="M50 30h30M50 42h40M50 54h24M50 66h18" />
      </g>
      <rect x="86" y="58" width="42" height="46" rx="7" fill="#2563eb" />
      <rect x="92" y="64" width="30" height="9" rx="2" fill="#bfdbfe" />
      <g fill="#fff">
        <circle cx="97" cy="82" r="2.6" />
        <circle cx="107" cy="82" r="2.6" />
        <circle cx="117" cy="82" r="2.6" />
        <circle cx="97" cy="92" r="2.6" />
        <circle cx="107" cy="92" r="2.6" />
      </g>
      <circle cx="122" cy="98" r="12" fill="#1d4ed8" stroke="#fff" strokeWidth="2" />
      <text x="122" y="103" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
        $
      </text>
    </svg>
  );
}

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";
const SELECT =
  "h-11 w-full appearance-none rounded-lg border bg-card pl-4 pr-10 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

export function CostingTable({ rows }: { rows: SheetRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [version, setVersion] = useState("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [page, setPage] = useState(1);

  const versions = useMemo(
    () => [...new Set(rows.map((r) => r.version))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rows]
  );
  const currencies = useMemo(() => [...new Set(rows.map((r) => r.currency))].sort(), [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (version === "ALL" || r.version === version) &&
        (currency === "ALL" || r.currency === currency) &&
        (!s || `${r.styleNo} ${r.styleName}`.toLowerCase().includes(s))
    );
  }, [rows, q, status, version, currency]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const filterSelect = (
    value: string,
    set: (v: string) => void,
    label: string,
    allLabel: string,
    options: readonly (readonly [string, string])[]
  ) => (
    <div className="relative w-full sm:w-44">
      <select
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setPage(1);
        }}
        aria-label={label}
        className={SELECT}
      >
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
            placeholder="Search costing..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {filterSelect(version, setVersion, "Version filter", "All versions", versions.map((v) => [v, v] as const))}
        {filterSelect(
          currency,
          setCurrency,
          "Currency filter",
          "All currencies",
          currencies.map((c) => [c, c] as const)
        )}
        {filterSelect(status, setStatus, "Status filter", "All statuses", STATUS_OPTIONS)}
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-980px text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Style</th>
              <th className={cn(TH, "text-left")}>Version</th>
              <th className={cn(TH, "text-left")}>Type</th>
              <th className={cn(TH, "text-left")}>Currency</th>
              <th className={cn(TH, "text-right")}>Total cost</th>
              <th className={cn(TH, "text-right")}>Margin</th>
              <th className={cn(TH, "text-right")}>Quoted price</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${status}-${version}-${currency}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = ST[r.status] ?? ST.DRAFT;
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/costing/${r.id}`}
                      className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                    >
                      {r.styleNo}
                    </Link>
                    <p className="text-[13px] text-slate-500">{r.styleName}</p>
                  </td>
                  <td className="px-4 py-3 text-[15px] font-medium text-navy-800">{r.version}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.currency}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.totalCost}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.margin}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium tabular-nums text-navy-800">
                    {r.quotedPrice}
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
                    <span className="flex items-center justify-end">
                      <Link
                        href={`/costing/${r.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" strokeWidth={2.5} />
                        View
                      </Link>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <EmptyArt />
            <p className="mt-2 font-heading text-xl font-semibold text-navy-800">No costing sheets yet</p>
            <p className="text-sm text-slate-500">Create a new costing sheet to get started.</p>
            <Link
              href="/costing/new"
              className="mt-3 inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Create Cost Sheet
            </Link>
          </div>
        )}

        {rows.length > 0 && shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            No costing sheets match your filters
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} sheets
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