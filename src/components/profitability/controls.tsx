"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, Download, FileSpreadsheet, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyerRow, OrderRow } from "./types";

const OPTIONS = [
  { k: "all", label: "All time" },
  { k: "this-month", label: "This month" },
  { k: "last-month", label: "Last month" },
  { k: "90d", label: "Last 90 days" },
  { k: "ytd", label: "Year to date" },
];

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function RangeSelect({ current, label }: { current: string; label: string }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-12 items-center gap-2.5 rounded-xl border bg-card px-4 text-sm font-medium text-navy-800 shadow-card hover:bg-slate-50"
      >
        <CalendarDays className="h-4.5 w-4.5" />
        {label}
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border bg-card p-1.5 shadow-xl">
          {OPTIONS.map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(o.k === "all" ? path : `${path}?range=${o.k}`);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50",
                current === o.k && "bg-blue-50 font-semibold text-blue-700"
              )}
            >
              {o.label}
              {current === o.k && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function download(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n"); // BOM: Excel-e UTF-8 thik dekhay
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  buyers,
  orders,
  rangeKey,
}: {
  buyers: BuyerRow[];
  orders: OrderRow[];
  rangeKey: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const head = ["Revenue", "Cost", "Margin", "Margin %"];

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-transform hover:-translate-y-0.5"
      >
        <Download className="h-4.5 w-4.5" />
        Export Report
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border bg-card p-1.5 shadow-xl">
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              download(`profitability-by-buyer-${rangeKey}.csv`, [
                ["Buyer", ...head],
                ...buyers.map((b) => [b.name, b.revenue, b.cost, b.margin, b.marginPct]),
              ]);
            }}
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500" /> By buyer (CSV)
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              download(`profitability-by-order-${rangeKey}.csv`, [
                ["Order", "Buyer", ...head],
                ...orders.map((o) => [o.orderNo, o.buyerName, o.revenue, o.cost, o.margin, o.marginPct]),
              ]);
            }}
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500" /> By order (CSV)
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              window.print();
            }}
          >
            <Printer className="h-4 w-4 text-slate-500" /> Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}