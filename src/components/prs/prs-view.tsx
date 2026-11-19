"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleDot, Copy, EllipsisVertical, Eye, Flag,
  Inbox, Layers, Pencil, Search, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PrRow = {
  id: string;
  prNo: string;
  source: string;
  priority: string;
  lines: number;
  requiredDate: string | null; // YYYY-MM-DD
  createdKey: string; // YYYY-MM-DD (Asia/Dhaka)
  createdLabel: string; // 2026-10-31 09:45 AM
  status: string;
};

const PAGE_SIZE = 10;

const label = (v: string) => v.replace(/_/g, " ").toLowerCase();

const ST: Record<string, { pill: string; dot: string }> = {
  DRAFT: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  SUBMITTED: { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  APPROVED: { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  REJECTED: { pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
  CANCELLED: { pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
  CLOSED: { pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
};
const ST_FALLBACK = { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };

const PRIORITY: Record<string, string> = {
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-rose-100 text-rose-600",
};

const RANGES: [string, string][] = [
  ["ALL", "Date Range"],
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["month", "This month"],
];

function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rangeStart(range: string, todayKey: string): string | null {
  if (range === "today") return todayKey;
  if (range === "7d") return shiftDay(todayKey, -6);
  if (range === "month") return `${todayKey.slice(0, 7)}-01`;
  return null;
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

const uniq = (list: string[]) => [...new Set(list)].sort();

function FilterPill({
  icon: Icon,
  name,
  value,
  onChange,
  options,
}: {
  icon: LucideIcon;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={name}
        className={cn(
          "h-12 w-full appearance-none rounded-xl border bg-card pl-11 pr-10 text-sm font-semibold capitalize text-navy-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-200",
          value !== "ALL" && "border-blue-400 bg-blue-50 text-blue-700"
        )}
      >
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
    </div>
  );
}

/* ---------- row-er ⋮ menu (fixed hoye khole, tai table-e kete jay na) ---------- */
function RowMenu({ row }: { row: PrRow }) {
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
      await navigator.clipboard.writeText(row.prNo);
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
        aria-label={`More actions for ${row.prNo}`}
        className="flex h-8 w-9 items-center justify-center rounded-lg border bg-card text-slate-600 transition-colors hover:bg-slate-50"
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
          className="z-50 w-48 rounded-xl border bg-card p-1.5 text-left shadow-xl"
        >
          <Link
            href={`/prs/${row.id}`}
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
            {copied ? "Copied" : "Copy PR no"}
          </button>
        </div>
      )}
    </>
  );
}

export function PrsView({
  rows,
  canEdit,
  todayKey,
}: {
  rows: PrRow[];
  canEdit: boolean;
  todayKey: string;
}) {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const sourceOpts: [string, string][] = [
    ["ALL", "All sources"],
    ...uniq(rows.map((r) => r.source)).map((v): [string, string] => [v, label(v)]),
  ];
  const priorityOpts: [string, string][] = [
    ["ALL", "All priorities"],
    ...uniq(rows.map((r) => r.priority)).map((v): [string, string] => [v, label(v)]),
  ];
  const statusOpts: [string, string][] = [
    ["ALL", "All statuses"],
    ...uniq(rows.map((r) => r.status)).map((v): [string, string] => [v, label(v)]),
  ];

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const from = rangeStart(range, todayKey);
    return rows.filter(
      (r) =>
        (source === "ALL" || r.source === source) &&
        (priority === "ALL" || r.priority === priority) &&
        (status === "ALL" || r.status === status) &&
        (!from || r.createdKey >= from) &&
        (!s || `${r.prNo} ${label(r.source)} ${label(r.priority)}`.toLowerCase().includes(s))
    );
  }, [rows, q, range, source, priority, status, todayKey]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const TH = "px-4 py-3.5 text-sm font-semibold text-navy-800";

  function pick(set: (v: string) => void) {
    return (v: string) => {
      set(v);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,auto))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search PR..."
            className="h-12 w-full rounded-xl border bg-card pl-11 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <FilterPill icon={CalendarDays} name="Date range" value={range} onChange={pick(setRange)} options={RANGES} />
        <FilterPill icon={Layers} name="Source" value={source} onChange={pick(setSource)} options={sourceOpts} />
        <FilterPill icon={Flag} name="Priority" value={priority} onChange={pick(setPriority)} options={priorityOpts} />
        <FilterPill icon={CircleDot} name="Status" value={status} onChange={pick(setStatus)} options={statusOpts} />
      </div>

      <div className="overflow-x-auto rounded-card border bg-card shadow-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "text-left")}>PR No.</th>
              <th className={cn(TH, "text-left")}>Source</th>
              <th className={cn(TH, "text-left")}>Priority</th>
              <th className={cn(TH, "text-left")}>Lines</th>
              <th className={cn(TH, "text-left")}>Required By</th>
              <th className={cn(TH, "text-left")}>Created</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody key={`${range}-${source}-${priority}-${status}-${q}-${cur}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = ST[r.status] ?? ST_FALLBACK;
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/prs/${r.id}`}
                      className="text-[15px] font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                    >
                      {r.prNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                      {label(r.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize",
                        PRIORITY[r.priority] ?? "bg-slate-100 text-slate-700"
                      )}
                    >
                      {label(r.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[15px] font-medium text-navy-800">{r.lines}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] font-medium text-navy-800">
                    {r.requiredDate ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] font-medium text-navy-800">
                    {r.createdLabel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize",
                        S.pill
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                      {label(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      <Link
                        href={`/prs/${r.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                        View
                      </Link>
                      {canEdit && r.status === "DRAFT" && (
                        <Link
                          href={`/prs/${r.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                          Edit
                        </Link>
                      )}
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
            {rows.length === 0 ? "No PRs yet" : "No PRs match your filters"}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm font-medium text-slate-600">
          {list.length} {list.length === 1 ? "PR" : "PRs"} • Page {cur} of {pages}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={cur === 1}
            onClick={() => setPage(cur - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border bg-card px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
                  "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold",
                  p === cur ? "border-blue-600 bg-blue-600 text-white" : "bg-card text-slate-600 hover:bg-slate-50"
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
            className="inline-flex h-9 items-center gap-1 rounded-lg border bg-card px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}