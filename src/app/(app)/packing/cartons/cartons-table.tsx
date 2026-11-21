"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";

const PAGE_SIZE = 10;

export type CartonRow = {
  id: string;
  cartonNo: string;
  packType: string;
  pieces: number;
  grossWeight: string;
  status: string;
};

const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

export function CartonsTable({ rows, hasAny }: { rows: CartonRow[]; hasAny: boolean }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) => !needle || `${r.cartonNo} ${r.packType}`.toLowerCase().includes(needle));

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

  const heads = ["Carton", "Pack Type", "Pieces", "Gross (kg)", "Status"];

  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-800 px-5 py-3.5 text-white">
        <h2 className="font-heading text-lg font-semibold">Carton List</h2>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search cartons..."
            className="h-10 w-full rounded-lg border border-white/20 bg-white pl-9 pr-3 text-sm text-navy-800 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-400/40"
          />
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
              <Package className="h-10 w-10" strokeWidth={2} />
            </span>
          </span>
          <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">
            {hasAny ? "No Cartons Match" : "No Cartons Yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {hasAny ? "Try a different status or search." : "Create cartons for finished goods and manage them here."}
          </p>
          {!hasAny && (
            <Link
              href="/packing/cartons/new"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Create Carton
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
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
                      <Link href={`/packing/cartons/${r.id}`} className="text-blue-700 hover:underline">
                        {r.cartonNo}
                      </Link>
                    </td>
                    <td className={`${td} capitalize`}>{r.packType}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.pieces.toLocaleString("en-US")}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.grossWeight || "-"}</td>
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
              Showing {from}–{to} of {total} cartons
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
  );
}