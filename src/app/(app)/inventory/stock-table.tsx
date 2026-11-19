"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type StockRow = {
  id: string;
  materialName: string;
  materialCode: string;
  warehouseId: string;
  warehouse: string;
  warehouseCode: string;
  onHand: number;
  unit: string;
};

const PAGE_SIZE = 10;
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

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

export function StockTable({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");
  const [wh, setWh] = useState("ALL");
  const [page, setPage] = useState(1);

  const warehouses = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.warehouseId, r.warehouse));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (wh === "ALL" || r.warehouseId === wh) &&
        (!s || `${r.materialName} ${r.materialCode}`.toLowerCase().includes(s))
    );
  }, [rows, q, wh]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

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
            placeholder="Search material..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="relative w-full sm:w-52">
          <select
            value={wh}
            onChange={(e) => {
              setWh(e.target.value);
              setPage(1);
            }}
            aria-label="Warehouse filter"
            className={SELECT}
          >
            <option value="ALL">All warehouses</option>
            {warehouses.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Material</th>
              <th className={cn(TH, "text-left")}>Warehouse</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>On hand</th>
            </tr>
          </thead>
          <tbody key={`${wh}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="text-[15px] font-semibold text-navy-800">{r.materialName}</p>
                  <p className="text-[13px] text-slate-500">{r.materialCode}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[15px] text-navy-800">{r.warehouse}</p>
                  {r.warehouseCode && <p className="text-[13px] text-slate-500">{r.warehouseCode}</p>}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right text-[15px] font-bold tabular-nums",
                    r.onHand < 0 ? "text-destructive" : "text-navy-800"
                  )}
                >
                  {fmt.format(r.onHand)} {r.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            {rows.length === 0 ? "No stock yet. Post a goods receipt to add stock." : "No stock matches your filters"}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} records
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