"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Copy, Ellipsis, Eye, Plus, RotateCcw, Search, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EnquiryRow = {
  id: string;
  no: string;
  buyer: string;
  items: number;
  units: number;
  target: number | null;
  currency: string;
  required: string | null; // YYYY-MM-DD
  status: string;
};

const PAGE_SIZE = 10;
const DAY = 86_400_000;
const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };
const money = (n: number, cur: string) => `${SYM[cur] ?? ""}${fmt2.format(n)}`;
const fmtDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/* ---------- status: naam dekhe rong ---------- */
type Kind = "new" | "progress" | "won" | "lost" | "other";
function kindOf(s: string): Kind {
  const u = s.toUpperCase();
  if (/(CONVERT|WON|CONFIRM|ACCEPT|APPROV)/.test(u)) return "won";
  if (/(LOST|REJECT|CANCEL|DECLIN|DROP)/.test(u)) return "lost";
  if (/(NEGOT|QUOT|REVIEW|PROGRESS|PENDING|SAMPL|COSTING)/.test(u)) return "progress";
  if (/(NEW|OPEN|DRAFT|RECEIVED|SUBMIT)/.test(u)) return "new";
  return "other";
}
const KIND_UI: Record<Kind, { pill: string; dot: string }> = {
  new: { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  progress: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  won: { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  lost: { pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
  other: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};
const human = (s: string) => {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const SHIP_SCOPES = [
  { v: "all", label: "Required ship" },
  { v: "30", label: "Within 30 days" },
  { v: "60", label: "Within 60 days" },
  { v: "past", label: "Past due" },
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

function SelectPill({
  icon,
  value,
  onChange,
  label,
  children,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-800">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-11 w-full appearance-none rounded-xl border bg-slate-50/60 pl-11 pr-9 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
    </div>
  );
}

function EmptyArt() {
  return (
    <svg viewBox="0 0 220 150" className="h-36 w-52 animate-float" aria-hidden="true">
      <circle cx="140" cy="78" r="52" fill="#eff6ff" />
      <rect x="52" y="22" width="88" height="106" rx="10" fill="#dbeafe" />
      <path d="M110 22 L140 52 H122 a12 12 0 0 1 -12 -12 Z" fill="#bfdbfe" />
      <rect x="66" y="58" width="44" height="8" rx="4" fill="#fff" />
      <rect x="66" y="76" width="62" height="8" rx="4" fill="#fff" />
      <rect x="66" y="94" width="52" height="8" rx="4" fill="#fff" />
      <circle cx="142" cy="96" r="22" fill="#fff" fillOpacity="0.55" stroke="#2563eb" strokeWidth="5" />
      <line x1="158" y1="113" x2="176" y2="132" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" />
      <g stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
        <line x1="38" y1="44" x2="46" y2="50" />
        <line x1="34" y1="58" x2="44" y2="60" />
        <line x1="168" y1="28" x2="162" y2="38" />
        <line x1="180" y1="40" x2="170" y2="44" />
      </g>
    </svg>
  );
}

/* ---------- row-er ... menu (fixed hoye khole, tai table-e kete jay na) ---------- */
function RowMenu({ row }: { row: EnquiryRow }) {
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
      await navigator.clipboard.writeText(row.no);
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
        aria-label={`More actions for ${row.no}`}
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
            href={`/enquiries/${row.id}`}
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
            {copied ? "Copied" : "Copy enquiry no"}
          </button>
        </div>
      )}
    </>
  );
}

export function EnquiriesView({
  rows,
  canCreate,
  todayKey,
}: {
  rows: EnquiryRow[];
  canCreate: boolean;
  todayKey: string; // YYYY-MM-DD
}) {
  const [q, setQ] = useState("");
  const [buyer, setBuyer] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [ship, setShip] = useState("all");
  const [page, setPage] = useState(1);

  const buyers = useMemo(() => [...new Set(rows.map((r) => r.buyer))].sort(), [rows]);
  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (buyer !== "ALL" && r.buyer !== buyer) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (s && !`${r.no} ${r.buyer}`.toLowerCase().includes(s)) return false;
      if (ship !== "all") {
        if (!r.required) return false;
        const days = Math.floor((Date.parse(`${r.required}T00:00:00Z`) - todayMs) / DAY);
        if (ship === "past" ? days >= 0 : days < 0 || days > Number(ship)) return false;
      }
      return true;
    });
  }, [rows, q, buyer, status, ship, todayMs]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const dirty = q !== "" || buyer !== "ALL" || status !== "ALL" || ship !== "all";
  const kindDot = status === "ALL" ? "bg-emerald-500" : KIND_UI[kindOf(status)].dot;

  function reset() {
    setQ("");
    setBuyer("ALL");
    setStatus("ALL");
    setShip("all");
    setPage(1);
  }

  const TH = "px-4 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600";
  const newBtn =
    "inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-transform hover:-translate-y-0.5";

  return (
    <div className="space-y-4">
      {/* ---------- filter bar ---------- */}
      <div className="grid gap-3 rounded-card border bg-card p-4 shadow-card md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-navy-800" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search enquiries..."
            className="h-11 w-full rounded-xl border bg-slate-50/60 pl-11 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <SelectPill
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          value={ship}
          label="Required ship"
          onChange={(v) => {
            setShip(v);
            setPage(1);
          }}
        >
          {SHIP_SCOPES.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </SelectPill>

        <SelectPill
          icon={<Users className="h-4.5 w-4.5" />}
          value={buyer}
          label="Buyer"
          onChange={(v) => {
            setBuyer(v);
            setPage(1);
          }}
        >
          <option value="ALL">Buyer</option>
          {buyers.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </SelectPill>

        <SelectPill
          icon={<span className={cn("block h-3 w-3 rounded-full", kindDot)} />}
          value={status}
          label="Status"
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <option value="ALL">Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {human(s)}
            </option>
          ))}
        </SelectPill>

        <button
          type="button"
          onClick={reset}
          disabled={!dirty}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-slate-50/60 px-5 text-sm font-semibold text-navy-800 hover:bg-slate-100 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* ---------- table ---------- */}
      <section className="rounded-card border bg-card shadow-card">
        <div className="overflow-x-auto rounded-t-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-slate-100/70">
                <th className={cn(TH, "pl-6 text-left")}>Enquiry #</th>
                <th className={cn(TH, "text-left")}>Buyer</th>
                <th className={cn(TH, "text-center")}>Items</th>
                <th className={cn(TH, "text-center")}>Units</th>
                <th className={cn(TH, "text-right")}>Target value</th>
                <th className={cn(TH, "text-left")}>Required ship</th>
                <th className={cn(TH, "text-left")}>Status</th>
                <th className={cn(TH, "pr-6 text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody key={`${q}-${buyer}-${status}-${ship}-${cur}`} className="stagger stagger-fast">
              {shown.map((r) => {
                const K = KIND_UI[kindOf(r.status)];
                const open = kindOf(r.status) === "new" || kindOf(r.status) === "progress";
                const late = !!r.required && r.required < todayKey && open;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">
                    <td className="px-4 py-3.5 pl-6">
                      <Link
                        href={`/enquiries/${r.id}`}
                        className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                      >
                        {r.no}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{r.buyer}</td>
                    <td className="px-4 py-3.5 text-center text-[15px] text-navy-800">{r.items}</td>
                    <td className="px-4 py-3.5 text-center text-[15px] text-navy-800">{fmt0.format(r.units)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right text-[15px] font-medium text-navy-800">
                      {r.target === null ? "-" : `${money(r.target, r.currency)} ${r.currency}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[15px]">
                      {r.required ? (
                        <span className={cn("inline-flex items-center gap-2", late ? "font-semibold text-rose-600" : "text-navy-800")}>
                          {fmtDate(r.required)}
                          {late && <span className="h-2 w-2 rounded-full bg-rose-500" title="Past due" aria-label="Past due" />}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold", K.pill)}>
                        <span className={cn("h-2 w-2 rounded-full", K.dot)} />
                        {human(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 pr-6">
                      <span className="flex items-center justify-end gap-2">
                        <Link
                          href={`/enquiries/${r.id}`}
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
            <div className="flex flex-col items-center py-12 text-center">
              <EmptyArt />
              {rows.length === 0 ? (
                <>
                  <p className="mt-3 text-xl font-bold text-navy-800">No enquiries found</p>
                  <p className="mt-1 text-slate-500">Create a new enquiry to get started.</p>
                  {canCreate && (
                    <Link href="/enquiries/new" className={cn(newBtn, "mt-5 h-12 px-7")}>
                      <Plus className="h-4.5 w-4.5" /> New Enquiry
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-3 text-xl font-bold text-navy-800">No enquiries match your filters</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-sm text-slate-600">
            {list.length} {list.length === 1 ? "row" : "rows"} · page {cur} of {pages}
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
      </section>
    </div>
  );
}