"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Ellipsis, Eye, Inbox, ListFilter, Pencil, Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StyleRow = {
  id: string;
  styleNo: string;
  name: string;
  buyer: string | null;
  category: string | null;
  season: string | null;
  status: string;
};

type SortKey = "styleNo" | "name" | "buyer" | "category" | "season" | "status";

const PAGE_SIZE = 10;
const COLS: { key: SortKey; label: string }[] = [
  { key: "styleNo", label: "Style No" },
  { key: "name", label: "Name" },
  { key: "buyer", label: "Buyer" },
  { key: "category", label: "Category" },
  { key: "season", label: "Season" },
  { key: "status", label: "Status" },
];

const human = (s: string) => {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// status-er naam dekhe rong (INACTIVE-ke age dhori, noyto "ACTIVE"-er shathe mishe jay)
function statusUi(s: string) {
  const u = s.toUpperCase();
  if (/(INACTIVE|ARCHIV|DISCONT|OBSOLETE)/.test(u)) return { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  if (/(REJECT|CANCEL|DROP)/.test(u)) return { pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" };
  if (/(HOLD|PENDING)/.test(u)) return { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
  if (/(APPROV|ACTIVE|RELEASE|CONFIRM)/.test(u)) return { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (/(DEVELOP|SAMPL|PROTO|REVIEW|PROGRESS|DRAFT|NEW)/.test(u)) return { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
  return { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

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

const valueOf = (r: StyleRow, k: SortKey) => (k === "status" ? human(r.status) : (r[k] ?? "")).toString();

/* ---------- row-er ... menu (fixed hoye khole, tai table-e kete jay na) ---------- */
function RowMenu({ row }: { row: StyleRow }) {
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
      await navigator.clipboard.writeText(row.styleNo);
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
        aria-label={`More actions for ${row.styleNo}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Ellipsis className="h-4.5 w-4.5" />
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
            href={`/styles/${row.id}`}
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
            {copied ? "Copied" : "Copy style no"}
          </button>
        </div>
      )}
    </>
  );
}

export function StylesView({ rows, canCreate }: { rows: StyleRow[]; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [buyer, setBuyer] = useState("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [fOpen, setFOpen] = useState(false);
  const fRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!fRef.current?.contains(e.target as Node)) setFOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [fOpen]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const buyers = useMemo(
    () => [...new Set(rows.map((r) => r.buyer).filter((b): b is string => !!b))].sort(),
    [rows]
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (buyer === "ALL" || r.buyer === buyer) &&
        (!s || `${r.styleNo} ${r.name} ${r.buyer ?? ""} ${r.category ?? ""} ${r.season ?? ""}`.toLowerCase().includes(s))
    );
    if (!sort) return f;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...f].sort(
      (a, b) => sign * valueOf(a, sort.key).localeCompare(valueOf(b, sort.key), undefined, { numeric: true })
    );
  }, [rows, q, status, buyer, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const activeFilters = (status !== "ALL" ? 1 : 0) + (buyer !== "ALL" ? 1 : 0);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  }

  const sel =
    "h-10 w-full rounded-lg border bg-card px-3 text-sm text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <section className="rounded-card border bg-card shadow-card">
      {/* ---------- search + filter ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="relative w-full max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-navy-800" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search styles..."
            className="h-12 w-full rounded-xl border bg-card pl-11 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div ref={fRef} className="relative">
          <button
            type="button"
            onClick={() => setFOpen((o) => !o)}
            aria-expanded={fOpen}
            className={cn(
              "inline-flex h-12 items-center gap-2.5 rounded-xl border bg-card px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50",
              activeFilters > 0 && "border-blue-400 bg-blue-50 text-blue-700"
            )}
          >
            <ListFilter className="h-4.5 w-4.5" />
            Filter
            {activeFilters > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] text-white">
                {activeFilters}
              </span>
            )}
          </button>
          {fOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 space-y-3 rounded-xl border bg-card p-4 shadow-xl">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className={sel}
                >
                  <option value="ALL">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {human(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</span>
                <select
                  value={buyer}
                  onChange={(e) => {
                    setBuyer(e.target.value);
                    setPage(1);
                  }}
                  className={sel}
                >
                  <option value="ALL">All buyers</option>
                  {buyers.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={activeFilters === 0}
                onClick={() => {
                  setStatus("ALL");
                  setBuyer("ALL");
                  setPage(1);
                }}
                className="w-full rounded-lg border py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- table ---------- */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              {COLS.map((c, i) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn("px-4 py-3.5 text-left", i === 0 && "pl-6")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600 hover:text-navy-800"
                    >
                      {c.label}
                      {active && (sort!.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-3.5 pr-6 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody key={`${q}-${status}-${buyer}-${sort?.key}-${sort?.dir}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = statusUi(r.status);
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                  <td className="px-4 py-3 pl-6">
                    <Link href={`/styles/${r.id}`} className="text-[15px] font-semibold text-blue-600 hover:underline">
                      {r.styleNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.name}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.buyer ?? "-"}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.category ?? "-"}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.season ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", S.pill)}>
                      <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                      {human(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 pr-6">
                    <span className="flex items-center gap-1">
                      <Link
                        href={`/styles/${r.id}`}
                        aria-label={`View ${r.styleNo}`}
                        title="View"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-slate-100"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </Link>
                      <Link
                        href={`/styles/${r.id}`}
                        aria-label={`Edit ${r.styleNo}`}
                        title="Open and edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <RowMenu row={r} />
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
            {rows.length === 0 ? "No styles yet" : "No styles match your filters"}
            {rows.length === 0 && canCreate && (
              <Link
                href="/styles/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> New style
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ---------- footer ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
        <p className="text-[15px] text-navy-800">
          {list.length} {list.length === 1 ? "row" : "rows"} • page {cur} of {pages}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={cur === 1}
            onClick={() => setPage(cur - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border px-3.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
            className="inline-flex h-9 items-center gap-1 rounded-lg border px-3.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}