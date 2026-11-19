"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronLeft, ChevronRight, Copy, EllipsisVertical, Eye, Inbox, ListFilter, Plus, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RecRow = {
  id: string;
  invoiceNo: string;
  buyer: string;
  total: number;
  received: number;
  currency: string;
  due: string | null; // YYYY-MM-DD
  status: string;
  overdue: boolean;
  dueThisMonth: boolean;
};

const PAGE_SIZE = 8;
const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };
const money = (n: number, cur: string) => `${SYM[cur] ?? ""}${fmt2.format(n)}`;

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  DRAFT: { label: "Draft", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  POSTED: { label: "Posted", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  PARTIALLY_PAID: { label: "Partially Paid", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  PAID: { label: "Paid", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
};
const STATUS_OPTIONS = [["ALL", "All statuses"], ...Object.entries(ST).map(([k, v]) => [k, v.label])];

// Partially Paid: overdue hole komola, na hole nil (reference-er moto)
function pillOf(r: RecRow) {
  if (r.status === "PARTIALLY_PAID" && !r.overdue) {
    return { label: "Partially Paid", pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
  }
  return ST[r.status] ?? ST.DRAFT;
}

const SCOPES = [
  { v: "all", label: "All invoices" },
  { v: "overdue", label: "Overdue" },
  { v: "month", label: "Due this month" },
];

// buyer-er rong: chena brand-er jonno fixed, baki hash theke
const BRAND: Record<string, string> = {
  "h&m": "bg-slate-900",
  zara: "bg-slate-900",
  mango: "bg-amber-500",
  primark: "bg-blue-600",
  walmart: "bg-sky-600",
};
const FALLBACK = ["bg-navy-800", "bg-emerald-600", "bg-violet-600", "bg-rose-500", "bg-teal-600", "bg-orange-500"];
const buyerColor = (name: string) =>
  BRAND[name.trim().toLowerCase()] ?? FALLBACK[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length];
const buyerMark = (name: string) => {
  const n = name.trim();
  return n.length <= 3 ? n.toUpperCase() : (n.charAt(0).toUpperCase() || "?");
};

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

/* ---------- row-er ⋮ menu (fixed hoye khole, tai table-e kete jay na) ---------- */
function RowMenu({ row }: { row: RecRow }) {
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
      await navigator.clipboard.writeText(row.invoiceNo);
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
        aria-label={`More actions for ${row.invoiceNo}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-slate-600 transition-colors hover:bg-slate-50"
      >
        <EllipsisVertical className="h-4 w-4" />
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
          className="z-50 w-52 rounded-xl border bg-card p-1.5 text-left shadow-xl"
        >
          <Link
            href={`/finance/receivables/${row.id}`}
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
            {copied ? "Copied" : "Copy invoice no"}
          </button>
        </div>
      )}
    </>
  );
}

export function ReceivablesView({ rows, canCreate }: { rows: RecRow[]; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [scope, setScope] = useState("all");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (scope === "all" || (scope === "overdue" ? r.overdue : r.dueThisMonth)) &&
        (!s || `${r.invoiceNo} ${r.buyer}`.toLowerCase().includes(s))
    );
  }, [rows, q, status, scope]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

  return (
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          Receivables List
        </h2>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice..."
              className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* status filter */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenu((o) => !o)}
              aria-expanded={menu}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium text-navy-800 hover:bg-slate-50",
                status !== "ALL" && "border-blue-400 bg-blue-50 text-blue-700"
              )}
            >
              <ListFilter className="h-4 w-4" />
              Filter
              {status !== "ALL" && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </button>
            {menu && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border bg-card p-1.5 shadow-xl">
                <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </p>
                {STATUS_OPTIONS.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setStatus(k);
                      setPage(1);
                      setMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50",
                      status === k && "bg-blue-50 font-semibold text-blue-700"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* due scope */}
          <div className="relative">
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setPage(1);
              }}
              aria-label="Due filter"
              className="h-11 appearance-none rounded-lg border bg-card pl-4 pr-10 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200"
            >
              {SCOPES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Invoice</th>
              <th className={cn(TH, "text-left")}>Buyer</th>
              <th className={cn(TH, "text-right")}>Total</th>
              <th className={cn(TH, "text-right")}>Received</th>
              <th className={cn(TH, "text-left")}>Due</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${status}-${scope}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = pillOf(r);
              const mark = buyerMark(r.buyer);
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/finance/receivables/${r.id}`}
                      className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                    >
                      {r.invoiceNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3 text-[15px] font-semibold text-navy-800">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-white",
                          mark.length > 1 ? "text-[8px]" : "text-xs",
                          buyerColor(r.buyer)
                        )}
                      >
                        {mark}
                      </span>
                      {r.buyer}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium text-navy-800">
                    {money(r.total, r.currency)} {r.currency}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] text-navy-800">
                    {money(r.received, r.currency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.due ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold",
                        S.pill
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                      {S.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      <Link
                        href={`/finance/receivables/${r.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" strokeWidth={2.5} />
                        View
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
            {rows.length === 0 ? "No buyer invoices yet" : "No invoices match your filters"}
            {rows.length === 0 && canCreate && (
              <Link
                href="/finance/receivables/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> New buyer invoice
              </Link>
            )}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} results
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