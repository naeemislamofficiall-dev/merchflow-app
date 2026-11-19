"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck, Bell, CalendarClock, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, Eye, FileText, Gauge, Inbox, Info, PackageOpen, Search, Ship,
  ShieldAlert, Timer, TriangleAlert, Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Sev = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertRow = {
  id: string;
  severity: Sev;
  category: string;
  title: string;
  message: string;
  href: string;
  since: string; // ISO
};

const DAY = 86_400_000;
const PAGE_SIZE = 5;

const SEV: Record<
  Sev,
  { label: string; icon: LucideIcon; card: string; box: string; solid: string; pill: string; dot: string; bar: string }
> = {
  CRITICAL: {
    label: "Critical",
    icon: TriangleAlert,
    card: "border-rose-200/70 from-rose-100/80 via-rose-50 to-white",
    box: "bg-rose-100",
    solid: "bg-rose-500",
    pill: "bg-rose-100 text-rose-600",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
  },
  HIGH: {
    label: "High",
    icon: CircleAlert,
    card: "border-amber-200/70 from-amber-100/80 via-amber-50 to-white",
    box: "bg-amber-100",
    solid: "bg-amber-400",
    pill: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
  },
  MEDIUM: {
    label: "Medium",
    icon: Info,
    card: "border-blue-200/70 from-blue-100/80 via-blue-50 to-white",
    box: "bg-blue-100",
    solid: "bg-blue-600",
    pill: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  LOW: {
    label: "Low",
    icon: CircleCheck,
    card: "border-emerald-200/70 from-emerald-100/80 via-emerald-50 to-white",
    box: "bg-emerald-100",
    solid: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
};
const ORDER: Sev[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const CAT_ICON: Record<string, LucideIcon> = {
  Shipment: Ship,
  "T&A": CalendarClock,
  Material: PackageOpen,
  Procurement: Truck,
  Sample: Timer,
  Approval: BadgeCheck,
  Quality: ShieldAlert,
  Production: Gauge,
  Compliance: FileText,
};

const RANGES = [
  { v: "all", label: "All time" },
  { v: "7", label: "Last 7 days" },
  { v: "30", label: "Last 30 days" },
  { v: "90", label: "Last 90 days" },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function ago(iso: string, nowMs: number) {
  const d = Math.floor((nowMs - Date.parse(iso)) / DAY);
  if (d <= 0) return "today";
  return d === 1 ? "1 day ago" : `${d} days ago`;
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

export function AlertsView({ alerts, nowIso }: { alerts: AlertRow[]; nowIso: string }) {
  const nowMs = Date.parse(nowIso);
  const [sev, setSev] = useState<Sev | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);

  const inRange = useMemo(() => {
    const days = range === "all" ? 0 : Number(range);
    return alerts.filter((a) => !days || nowMs - Date.parse(a.since) <= days * DAY);
  }, [alerts, range, nowMs]);

  const counts = useMemo(() => {
    const c: Record<Sev, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const a of inRange) c[a.severity]++;
    return c;
  }, [inRange]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return inRange.filter(
      (a) =>
        (sev === "ALL" || a.severity === sev) &&
        (!s || `${a.title} ${a.message} ${a.category}`.toLowerCase().includes(s))
    );
  }, [inRange, sev, q]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const total = inRange.length;

  const pick = (s: Sev | "ALL") => {
    setSev(s);
    setPage(1);
  };

  return (
    <div className="stagger space-y-5">
      {/* ---------- Header ---------- */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-card">
            <Bell className="h-8 w-8" fill="currentColor" fillOpacity={0.15} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Alerts</h1>
            <p className="text-sm text-slate-500">Stay informed about important updates and activities.</p>
          </div>
        </div>

        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setPage(1);
            }}
            aria-label="Date range"
            className="appearance-none rounded-xl border bg-card py-2.5 pl-10 pr-9 text-sm font-medium text-navy-800 shadow-card outline-none focus:ring-2 focus:ring-blue-200"
          >
            {RANGES.map((r) => (
              <option key={r.v} value={r.v}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </header>

      {/* ---------- Severity cards ---------- */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ORDER.map((s) => {
          const S = SEV[s];
          const Icon = S.icon;
          const share = total > 0 ? Math.round((counts[s] / total) * 100) : 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => pick(sev === s ? "ALL" : s)}
              aria-pressed={sev === s}
              className={cn(
                "group rounded-card border bg-linear-to-br p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                S.card,
                sev === s && "ring-2 ring-blue-500/50"
              )}
            >
              <div className="flex items-center gap-4">
                <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", S.box)}>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform duration-200 group-hover:scale-110",
                      S.solid
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800">{S.label}</p>
                  <p className="text-3xl font-bold leading-tight tabular-nums text-navy-800">{counts[s]}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                  <div className={cn("h-full rounded-full", S.bar)} style={{ width: `${Math.max(share, counts[s] ? 4 : 0)}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{share}% of all alerts</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ---------- List ---------- */}
      <section className="rounded-card border bg-card p-4 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { k: "ALL", label: "All Alerts", n: total },
                ...ORDER.map((s) => ({ k: s, label: SEV[s].label, n: counts[s] })),
              ] as { k: Sev | "ALL"; label: string; n: number }[]
            ).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => pick(t.k)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  sev === t.k
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                )}
              >
                {t.label} ({t.n})
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search alerts..."
              className="w-full rounded-full border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="bg-blue-50/70 text-left text-[13px] font-semibold text-navy-800">
                <th className="rounded-l-lg px-4 py-3">Severity</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Alert</th>
                <th className="px-4 py-3">Date</th>
                <th className="rounded-r-lg px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody key={`${sev}-${cur}-${q}-${range}`} className="stagger stagger-fast">
              {rows.map((a) => {
                const S = SEV[a.severity];
                const CatIcon = CAT_ICON[a.category] ?? Bell;
                return (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", S.pill)}>
                        <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                        {S.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2.5 text-slate-700">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <CatIcon className="h-4 w-4" />
                        </span>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-navy-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.message}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="text-slate-700">{fmtDate(a.since)}</p>
                      <p className="text-[11px] text-slate-500">{ago(a.since, nowMs)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={a.href}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-slate-500">
              <Inbox className="h-9 w-9 animate-float text-slate-300" />
              {alerts.length === 0 ? "No alerts. Everything is on track." : "No alerts match your filters."}
            </div>
          )}
        </div>

        {list.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-sm text-slate-500">
              Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length} alerts
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
    </div>
  );
}