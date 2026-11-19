"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Copy, Ellipsis, Eye,
  Globe, Inbox, Plus, RotateCcw, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { statusKind, statusUi, type StatusKind } from "./status";

export type BuyerRow = {
  id: string;
  code: string;
  name: string;
  country: string | null;
  currency: string;
  paymentTerms: string | null;
  status: string;
};

type SortKey = "code" | "name" | "country" | "currency" | "paymentTerms" | "status";

const PAGE_SIZE = 10;
const COLS: { key: SortKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "country", label: "Country" },
  { key: "currency", label: "Currency" },
  { key: "paymentTerms", label: "Payment terms" },
  { key: "status", label: "Status" },
];

// row-er bam-er rongin dag
const ACCENT = ["#3b82f6", "#a855f7", "#f59e0b", "#f97316", "#ec4899", "#14b8a6", "#10b981", "#06b6d4"];

const ISO: Record<string, string> = {
  sweden: "SE", spain: "ES", ireland: "IE", usa: "US", "united states": "US", china: "CN",
  bangladesh: "BD", india: "IN", germany: "DE", france: "FR", italy: "IT", uk: "GB",
  "united kingdom": "GB", netherlands: "NL", denmark: "DK", norway: "NO", canada: "CA",
  australia: "AU", japan: "JP", turkey: "TR", vietnam: "VN", pakistan: "PK", poland: "PL",
  belgium: "BE", finland: "FI", portugal: "PT", switzerland: "CH", austria: "AT",
};

const STATUS_FILTER: { v: "ALL" | StatusKind; label: string; dot: string }[] = [
  { v: "ALL", label: "All Status", dot: "bg-emerald-500" },
  { v: "active", label: "Active", dot: "bg-emerald-500" },
  { v: "hold", label: "On Hold", dot: "bg-amber-500" },
  { v: "inactive", label: "Inactive", dot: "bg-slate-400" },
];

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

const valueOf = (r: BuyerRow, k: SortKey) => (k === "status" ? statusUi(r.status).label : (r[k] ?? "")).toString();

/* ---------- row-er ... menu (fixed hoye khole, tai table-e kete jay na) ---------- */
function RowMenu({ row }: { row: BuyerRow }) {
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) return setPos(null);
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + 130 > window.innerHeight;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, right: window.innerWidth - r.right, up });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(row.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* browser clipboard block korle kichu hobe na */
    }
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${row.name}`}
        className="flex h-8 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            transform: pos.up ? "translateY(-100%)" : undefined,
          }}
          className="z-50 w-48 rounded-xl border bg-card p-1.5 text-left shadow-xl"
        >
          <Link
            href={`/buyers/${row.id}`}
            role="menuitem"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
          >
            <Eye className="h-4 w-4 text-slate-500" /> View details
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      )}
    </>
  );
}

export function BuyersView({ rows, canCreate }: { rows: BuyerRow[]; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("ALL");
  const [status, setStatus] = useState<"ALL" | StatusKind>("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country).filter((c): c is string => !!c))].sort(),
    [rows]
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = rows.filter(
      (r) =>
        (country === "ALL" || r.country === country) &&
        (status === "ALL" || statusKind(r.status) === status) &&
        (!s || `${r.code} ${r.name} ${r.country ?? ""} ${r.paymentTerms ?? ""}`.toLowerCase().includes(s))
    );
    if (!sort) return f;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...f].sort((a, b) => sign * valueOf(a, sort.key).localeCompare(valueOf(b, sort.key), undefined, { numeric: true }));
  }, [rows, q, country, status, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const dirty = q !== "" || country !== "ALL" || status !== "ALL" || sort !== null;
  const dot = STATUS_FILTER.find((o) => o.v === status)?.dot ?? "bg-emerald-500";

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  }

  function reset() {
    setQ("");
    setCountry("ALL");
    setStatus("ALL");
    setSort(null);
    setPage(1);
  }

  const select =
    "h-12 w-full appearance-none rounded-xl border bg-card pl-11 pr-10 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="space-y-4">
      {/* ---------- filter bar ---------- */}
      <div className="grid gap-3 rounded-card border bg-card p-4 shadow-card md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-navy-800" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search buyers..."
            className="h-12 w-full rounded-xl border bg-card pl-11 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="relative">
          <Globe className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-blue-600" />
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            aria-label="Country"
            className={select}
          >
            <option value="ALL">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
        </div>

        <div className="relative">
          <span className={cn("pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full", dot)} />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "ALL" | StatusKind);
              setPage(1);
            }}
            aria-label="Status"
            className={select}
          >
            {STATUS_FILTER.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={!dirty}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-card px-6 text-sm font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* ---------- table ---------- */}
      <section className="rounded-card border bg-card p-4 shadow-card">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-blue-600 text-xs font-semibold uppercase tracking-wide text-white">
                {COLS.map((c, i) => {
                  const active = sort?.key === c.key;
                  return (
                    <th
                      key={c.key}
                      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={cn("px-4 py-3.5 text-left", i === 0 && "rounded-l-xl pl-5")}
                    >
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 uppercase">
                        {c.label}
                        {active ? (
                          sort!.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-70" />
                        )}
                      </button>
                    </th>
                  );
                })}
                <th className="rounded-r-xl px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody key={`${q}-${country}-${status}-${sort?.key}-${sort?.dir}-${cur}`} className="stagger stagger-fast">
              {shown.map((r, i) => {
                const S = statusUi(r.status);
                const code = r.country ? ISO[r.country.trim().toLowerCase()] : undefined;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                    <td className="relative px-4 py-3.5 pl-5 text-[15px] font-medium text-slate-600">
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1.5 left-0 top-1.5 w-0.75 rounded-full"
                        style={{ backgroundColor: ACCENT[i % ACCENT.length] }}
                      />
                      {r.code}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/buyers/${r.id}`} className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2.5 text-[15px] text-navy-800">
                        {r.country ? (
                          code ? (
                            <span className="flex h-6 w-8 items-center justify-center rounded-md bg-linear-to-br from-slate-100 to-slate-200 text-[10px] font-bold tracking-wide text-slate-600 ring-1 ring-slate-300/60">
                              {code}
                            </span>
                          ) : (
                            <Globe className="h-5 w-5 text-slate-400" />
                          )
                        ) : (
                          <Globe className="h-5 w-5 text-slate-400" />
                        )}
                        {r.country ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{r.currency}</td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{r.paymentTerms || "-"}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold", S.pill)}>
                        <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                        {S.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <RowMenu row={r} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {shown.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
              <Inbox className="h-9 w-9 animate-float text-slate-300" />
              {rows.length === 0 ? "No buyers yet" : "No buyers match your filters"}
              {rows.length === 0 && canCreate && (
                <Link
                  href="/buyers/new"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Add buyer
                </Link>
              )}
            </div>
          )}
        </div>

        {list.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-sm text-slate-500">
              Showing {(cur - 1) * PAGE_SIZE + 1} to {Math.min(cur * PAGE_SIZE, list.length)} of {list.length} entries
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={cur === 1}
                onClick={() => setPage(cur - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
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
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}