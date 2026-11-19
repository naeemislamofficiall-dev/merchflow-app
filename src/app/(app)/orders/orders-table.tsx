"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  orderNo: string;
  buyerPoNo: string;
  buyer: string;
  shipDate: string; // YYYY-MM-DD ba ""
  units: number;
  value: string;
  status: string;
};

const PAGE_SIZE = 10;

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  DRAFT: { label: "Draft", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  CONFIRMED: { label: "Confirmed", pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  IN_PRODUCTION: { label: "In Production", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  PARTIALLY_SHIPPED: { label: "Partially Shipped", pill: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  FULLY_SHIPPED: { label: "Fully Shipped", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  CLOSED: { label: "Closed", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
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

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";
const SELECT =
  "h-11 w-full appearance-none rounded-lg border bg-card pl-4 pr-10 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [buyer, setBuyer] = useState("ALL");
  const [page, setPage] = useState(1);

  const buyers = useMemo(() => [...new Set(rows.map((r) => r.buyer))].sort(), [rows]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (buyer === "ALL" || r.buyer === buyer) &&
        (!s || `${r.orderNo} ${r.buyerPoNo} ${r.buyer}`.toLowerCase().includes(s))
    );
  }, [rows, q, status, buyer]);

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
            placeholder="Search orders..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="relative w-full sm:w-48">
          <select
            value={buyer}
            onChange={(e) => {
              setBuyer(e.target.value);
              setPage(1);
            }}
            aria-label="Buyer filter"
            className={SELECT}
          >
            <option value="ALL">All buyers</option>
            {buyers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
        </div>

        <div className="relative w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Status filter"
            className={SELECT}
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Order #</th>
              <th className={cn(TH, "text-left")}>Buyer PO #</th>
              <th className={cn(TH, "text-left")}>Buyer</th>
              <th className={cn(TH, "text-left")}>Ship date</th>
              <th className={cn(TH, "text-right")}>Units</th>
              <th className={cn(TH, "text-right")}>Value</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${status}-${buyer}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = ST[r.status] ?? ST.DRAFT;
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${r.id}`}
                      className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                    >
                      {r.orderNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.buyerPoNo || "-"}</td>
                  <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{r.buyer}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.shipDate || "-"}</td>
                  <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.units.toLocaleString("en-US")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium tabular-nums text-navy-800">
                    {r.value}
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
                        href={`/orders/${r.id}`}
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

        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            {rows.length === 0 ? "No orders yet" : "No orders match your filters"}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} orders
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