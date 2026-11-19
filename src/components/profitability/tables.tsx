"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Inbox, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyerRow, OrderRow } from "./types";
import { buyerColor, buyerMark, fmt2, marginPill } from "./format";

type Metric = "revenue" | "cost" | "margin" | "marginPct";
const TABS: { k: Metric; label: string }[] = [
  { k: "revenue", label: "Revenue" },
  { k: "cost", label: "Cost" },
  { k: "margin", label: "Margin" },
  { k: "marginPct", label: "Margin %" },
];

const TH = "px-4 py-3 text-[13px] font-semibold text-navy-800";

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
      <Inbox className="h-9 w-9 animate-float text-slate-300" />
      {text}
    </div>
  );
}

export function BuyerSection({ buyers }: { buyers: BuyerRow[] }) {
  const [tab, setTab] = useState<Metric>("revenue");
  const rows = useMemo(() => [...buyers].sort((a, b) => b[tab] - a[tab]), [buyers, tab]);
  const col = (k: Metric) => cn(TH, tab === k && "text-blue-600");

  return (
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Users className="h-5 w-5" />
          </span>
          By Buyer
        </h2>
        <div role="tablist" className="inline-flex rounded-lg border bg-slate-50 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t.k ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty text="No invoiced orders in this period" />
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className={cn(TH, "w-10 rounded-l-lg text-left")}>#</th>
                <th className={cn(TH, "text-left")}>Buyer</th>
                <th className={cn(col("revenue"), "text-right")}>Revenue</th>
                <th className={cn(col("cost"), "text-right")}>Cost</th>
                <th className={cn(col("margin"), "text-right")}>Margin</th>
                <th className={cn(col("marginPct"), "rounded-r-lg text-right")}>Margin %</th>
              </tr>
            </thead>
            <tbody key={tab} className="stagger stagger-fast">
              {rows.map((b, i) => {
                const mark = buyerMark(b.name);
                return (
                  <tr key={b.buyerId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3 text-[15px] font-semibold text-navy-800">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white",
                            mark.length > 1 ? "text-[9px]" : "text-xs",
                            buyerColor(b.name)
                          )}
                        >
                          {mark}
                        </span>
                        {b.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(b.revenue)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(b.cost)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(b.margin)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold", marginPill(b.marginPct))}>
                        {b.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function OrderSection({
  orders,
  rangeKey,
  selectedId,
}: {
  orders: OrderRow[];
  rangeKey: string;
  selectedId: string | null;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? orders : orders.slice(0, 8);
  const href = (id: string) =>
    `/finance/profitability?${rangeKey === "all" ? "" : `range=${rangeKey}&`}order=${id}#styles`;

  return (
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </span>
          By Order
        </h2>
        <span className="text-xs text-slate-500">Click an order to see its margin by style</span>
      </div>

      {orders.length === 0 ? (
        <Empty text="No invoiced orders in this period" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className={cn(TH, "w-10 rounded-l-lg text-left")}>#</th>
                  <th className={cn(TH, "text-left")}>Order</th>
                  <th className={cn(TH, "text-right")}>Revenue</th>
                  <th className={cn(TH, "text-right")}>Cost</th>
                  <th className={cn(TH, "text-right")}>Margin</th>
                  <th className={cn(TH, "rounded-r-lg text-right")}>Margin %</th>
                </tr>
              </thead>
              <tbody className="stagger stagger-fast">
                {shown.map((o, i) => (
                  <tr
                    key={o.orderId}
                    className={cn("border-b border-slate-100 last:border-0", selectedId === o.orderId && "bg-blue-50/60")}
                  >
                    <td className="px-4 py-3 font-medium text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={href(o.orderId)} className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline">
                        {o.orderNo}
                      </Link>
                      <span className="block text-[11px] text-slate-400">{o.buyerName}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(o.revenue)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(o.cost)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">{fmt2.format(o.margin)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold", marginPill(o.marginPct))}>
                        {o.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length > 8 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-3 w-full rounded-xl border-2 border-dashed border-blue-200 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              {all ? "Show fewer" : `Show all (${orders.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}