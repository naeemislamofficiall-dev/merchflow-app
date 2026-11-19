"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type MrpRow = {
  id: string;
  runDate: string; // YYYY-MM-DD
  styleNo: string;
  bom: string;
  order: string;
  orderQty: number;
  lines: number;
  pr: string;
};

const PAGE_SIZE = 10;

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

export function MrpTable({ rows }: { rows: MrpRow[] }) {
  const [q, setQ] = useState("");
  const [style, setStyle] = useState("ALL");
  const [bom, setBom] = useState("ALL");
  const [page, setPage] = useState(1);

  const styles = useMemo(() => [...new Set(rows.map((r) => r.styleNo))].sort(), [rows]);
  const boms = useMemo(
    () => [...new Set(rows.map((r) => r.bom))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rows]
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (style === "ALL" || r.styleNo === style) &&
        (bom === "ALL" || r.bom === bom) &&
        (!s || `${r.runDate} ${r.styleNo} ${r.order} ${r.pr}`.toLowerCase().includes(s))
    );
  }, [rows, q, style, bom]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const filterSelect = (
    value: string,
    set: (v: string) => void,
    label: string,
    allLabel: string,
    options: string[]
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
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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
            placeholder="Search MRP run..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {filterSelect(style, setStyle, "Style filter", "All styles", styles)}
        {filterSelect(bom, setBom, "BOM filter", "All BOM versions", boms)}
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Run date</th>
              <th className={cn(TH, "text-left")}>Style</th>
              <th className={cn(TH, "text-left")}>BOM</th>
              <th className={cn(TH, "text-left")}>Order</th>
              <th className={cn(TH, "text-right")}>Quantity</th>
              <th className={cn(TH, "text-right")}>Items</th>
              <th className={cn(TH, "text-left")}>PR</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${style}-${bom}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/material-requirements/${r.id}`}
                    className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                  >
                    {r.runDate}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{r.styleNo}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {r.bom}
                  </span>
                </td>
                <td className="px-4 py-3 text-[15px] text-navy-800">{r.order || "-"}</td>
                <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                  {r.orderQty.toLocaleString("en-US")}
                </td>
                <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">{r.lines}</td>
                <td className="px-4 py-3 text-[15px] text-navy-800">{r.pr || "-"}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center justify-end">
                    <Link
                      href={`/material-requirements/${r.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4" strokeWidth={2.5} />
                      View
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            {rows.length === 0 ? "No MRP runs yet" : "No MRP runs match your filters"}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            {list.length} runs · Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of{" "}
            {list.length}
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