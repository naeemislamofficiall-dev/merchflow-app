"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Search, ShoppingCart, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export type PortalRow = {
  id: string;
  name: string;
  email: string;
  type: string;
  linked: string;
  status: string;
  lastLogin: string;
};

const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

export function PortalUsersTable({ rows }: { rows: PortalRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!type || r.type === type) &&
      (!needle || `${r.name} ${r.email} ${r.linked}`.toLowerCase().includes(needle))
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

  const heads = ["Name", "Email", "Type", "Linked To", "Status", "Last Login"];

  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-blue-600" />
          <h2 className="font-heading text-lg font-semibold text-navy-800">Portal Users List</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800"
          >
            <option value="">All types</option>
            <option value="BUYER">Buyer</option>
            <option value="SUPPLIER">Supplier</option>
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search users..."
              className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center border-t border-slate-100 px-4 py-12 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
              <Users className="h-8 w-8" />
            </span>
          </span>
          <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">
            {rows.length === 0 ? "No Portal Users Yet" : "No Users Match"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length === 0 ? "Create a portal user to give a buyer or supplier access." : "Try a different search."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
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
                    <td className={td}>
                      <span className="flex items-center gap-3 font-medium">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                          {r.name.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        {r.name}
                      </span>
                    </td>
                    <td className={td}>{r.email}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold uppercase text-blue-700">
                        {r.type === "SUPPLIER" ? <Building2 className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        {r.type}
                      </span>
                    </td>
                    <td className={td}>{r.linked}</td>
                    <td className={td}>
                      <span
                        className={cn(
                          "inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {r.status.toLowerCase()}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{r.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <span className="text-sm font-medium text-navy-800">
              Showing {from}–{to} of {total} users
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