"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Eye, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export type BatchRow = {
  id: string;
  type: string;
  fileName: string;
  status: string;
  totalRows: number;
  okRows: number;
  errorRows: number;
  skippedRows: number;
  uploaded: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  IMPORTED: { label: "Imported", cls: "bg-emerald-100 text-emerald-700" },
  VALIDATED: { label: "Validated", cls: "bg-blue-100 text-blue-700" },
  HAS_ERRORS: { label: "Has errors", cls: "bg-red-100 text-red-700" },
  FAILED: { label: "Failed", cls: "bg-red-100 text-red-700" },
};

const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";
const n = (v: number) => v.toLocaleString("en-US");

export function BatchesTable({ rows }: { rows: BatchRow[] }) {
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + PAGE_SIZE, total);

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - current) <= 1
  );

  const heads = ["Type", "File", "Status", "Rows", "OK", "Errors", "Skipped", "Uploaded", "Actions"];

  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <Clock className="h-5 w-5 text-blue-600" />
        <h2 className="font-heading text-lg font-semibold text-navy-800">Recent Batches</h2>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center border-t border-slate-100 px-4 py-12 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
              <Upload className="h-8 w-8" strokeWidth={2} />
            </span>
          </span>
          <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">No Imports Yet</h3>
          <p className="mt-1 text-sm text-slate-600">Upload a file above to start your first import.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
                <tr>
                  {heads.map((h, i) => (
                    <th key={h} className={cn(th, i >= 3 && i <= 6 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => {
                  const s = STATUS[b.status] ?? { label: b.status, cls: "bg-slate-100 text-slate-700" };
                  return (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className={`${td} whitespace-nowrap font-medium`}>{b.type}</td>
                      <td className={td}>
                        <Link href={`/import/${b.id}`} className="font-semibold text-blue-700 hover:underline">
                          {b.fileName}
                        </Link>
                      </td>
                      <td className={td}>
                        <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold", s.cls)}>
                          {s.label}
                        </span>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{n(b.totalRows)}</td>
                      <td className={`${td} text-right tabular-nums`}>{n(b.okRows)}</td>
                      <td
                        className={cn(
                          td,
                          "text-right tabular-nums",
                          b.errorRows > 0 && "font-semibold text-red-600"
                        )}
                      >
                        {n(b.errorRows)}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{n(b.skippedRows)}</td>
                      <td className={`${td} whitespace-nowrap`}>{b.uploaded}</td>
                      <td className={td}>
                        <Link
                          href={`/import/${b.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <span className="text-sm font-medium text-navy-800">
              Showing {from}–{to} of {total} batches
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