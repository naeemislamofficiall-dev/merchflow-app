"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, RotateCcw, Search, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export type ForwarderRow = {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  isActive: boolean;
};

type Filters = { code: string; name: string; contact: string; phone: string };
const EMPTY: Filters = { code: "", name: "", contact: "", phone: "" };

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

const has = (hay: string, needle: string) => !needle.trim() || hay.toLowerCase().includes(needle.trim().toLowerCase());

export function ForwardersTable({ rows, canAdd }: { rows: ForwarderRow[]; canAdd: boolean }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const filtered = rows.filter(
    (r) =>
      has(r.code, applied.code) &&
      has(r.name, applied.name) &&
      has(r.contactName, applied.contact) &&
      has(r.phone, applied.phone)
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

  const heads = ["Code", "Company Name", "Contact Name", "Phone", "Email", "Status"];

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
        className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
          <Filter className="h-5 w-5 text-blue-600" />
          <h2 className="font-heading text-lg font-semibold text-navy-800">Filter Options</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-4 p-5">
          {(
            [
              ["code", "Code", "Enter forwarder code..."],
              ["name", "Company name", "Enter company name..."],
              ["contact", "Contact name", "Enter contact name..."],
              ["phone", "Phone", "Enter phone number..."],
            ] as const
          ).map(([key, label, ph]) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="block font-semibold text-navy-800">{label}</span>
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                placeholder={ph}
                className={field}
              />
            </label>
          ))}
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} /> Search
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY);
                setApplied(EMPTY);
                setPage(1);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        {total === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
                <Truck className="h-10 w-10" strokeWidth={2} />
              </span>
            </span>
            <h3 className="mt-4 font-heading text-xl font-semibold text-navy-800">
              {rows.length === 0 ? "No Forwarders Yet" : "No Forwarders Match"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {rows.length === 0
                ? "Add freight forwarder information to manage your shipments."
                : "Try different filters."}
            </p>
            {rows.length === 0 && canAdd && (
              <a
                href="#add-forwarder"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Forwarder
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy-800 text-white">
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
                      <td className={`${td} font-semibold`}>{r.code}</td>
                      <td className={td}>{r.name}</td>
                      <td className={td}>{r.contactName || "—"}</td>
                      <td className={td}>{r.phone || "—"}</td>
                      <td className={td}>{r.email || "—"}</td>
                      <td className={td}>
                        <span
                          className={cn(
                            "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                            r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <span className="text-sm font-medium text-navy-800">
                Showing {from}–{to} of {total} forwarders
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
    </div>
  );
}