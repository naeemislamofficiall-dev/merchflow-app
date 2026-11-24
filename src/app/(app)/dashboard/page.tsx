import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Banknote, BarChart3, Box, Boxes, CalendarClock, ClipboardList, FileText,
  Gauge, Layers, PackageOpen, PieChart, Shirt, Ship, ShieldAlert, ShoppingBag, ShoppingCart, Timer,
  TrendingUp, Trophy, Truck, TriangleAlert, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { KpiCard } from "@/components/detail/kpi-card";
import { DashboardHero } from "@/components/dashboard/hero";
import {
  BarRow, DonutChart, DualBars, EmptyState, InsightCard, MetricCard, PairedColumns, Panel, RingGauge,
  RankRow, Sparkline, TargetBar,
} from "@/components/dashboard/widgets";
import { dashboardService } from "@/services/dashboard.service";
import { alertService } from "@/services/alert.service";
import { RevealObserver } from "@/components/dashboard/reveal-observer";

const num = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
const toPct = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtShort = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "-";


async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const trendOf = (p: number | null | undefined) =>
  p === null || p === undefined ? undefined : { value: `${Math.abs(p)}%`, up: p >= 0, label: "vs. last month" };

const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "#94a3b8" },
  CONFIRMED: { label: "Confirmed", color: "#3b82f6" },
  IN_PRODUCTION: { label: "In production", color: "#8b5cf6" },
  PARTIALLY_SHIPPED: { label: "Part shipped", color: "#f59e0b" },
  FULLY_SHIPPED: { label: "Shipped", color: "#10b981" },
  CLOSED: { label: "Closed", color: "#14b8a6" },
};
const statusOf = (s: string) =>
  STATUS[s] ?? { label: s.replace(/_/g, " ").toLowerCase(), color: "#94a3b8" };

const PROGRESS_STAGES = [
  { status: "DRAFT", label: "Draft", color: "#38bdf8" },
  { status: "CONFIRMED", label: "Confirmed", color: "#3b82f6" },
  { status: "IN_PRODUCTION", label: "In production", color: "#8b5cf6" },
  { status: "PARTIALLY_SHIPPED", label: "Part shipped", color: "#f59e0b" },
  { status: "FULLY_SHIPPED", label: "Shipped", color: "#10b981" },
  { status: "CLOSED", label: "Closed", color: "#14b8a6" },
];

const WATCH_COLOR: Record<string, string> = {
  Shortage: "#ef4444",
  Delay: "#f43f5e",
  "Low stock": "#f59e0b",
  OK: "#10b981",
};

const SEV_ICON: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-600",
  HIGH: "bg-orange-100 text-orange-600",
  MEDIUM: "bg-amber-100 text-amber-600",
  LOW: "bg-slate-100 text-slate-500",
};

const ALERT_ICON: Record<string, LucideIcon> = {
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

function timeAgo(since: Date, nowMs: number) {
  if (!nowMs) return "";
  const mins = Math.floor((nowMs - new Date(since).getTime()) / 60000);
  if (mins < 0) return "";
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PALETTE = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];
// Production overview: ring-er rong (nil, teal, beguni, komola) ar table-er bar-er rong
const RING_COLORS = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f97316"];
const BAR_COLORS = ["#14b8a6", "#14b8a6", "#8b5cf6", "#f97316"];
const pill = (color: string) => ({ color, backgroundColor: `${color}1f` });

const TH = "pb-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";

export default async function DashboardPage() {
    const [ov, ceo, merch, proc, orders, alerts, progress, buyers, shipments, factory, week, watch, trend, fin, pday] =
    await Promise.all([
      safe(() => dashboardService.overview()),
      safe(() => dashboardService.ceo()),
      safe(() => dashboardService.merchandising()),
      safe(() => dashboardService.procurement()),
      safe(() => dashboardService.recentOrders(6)),
      safe(() => alertService.list()),
      safe(() => dashboardService.orderProgress()),
      safe(() => dashboardService.topBuyers(5)),
      safe(() => dashboardService.upcomingShipments(5)),
      safe(() => dashboardService.factory()),
      safe(() => dashboardService.lineWeek()),
      safe(() => dashboardService.watchlist(6)),
      safe(() => dashboardService.orderTrend()),
      safe(() => dashboardService.finance()),
      safe(() => dashboardService.productionDay()),
    ]);

  if (!ceo && !merch && !proc) {
    return <p className="text-muted-foreground">You do not have access to the dashboard.</p>;
  }

  const nowMs = ov ? Date.parse(ov.nowIso) : 0;
  const year = ov ? new Date(ov.nowIso).getFullYear() : "";
  const currency = ceo?.currency ?? proc?.currency ?? "";
  const progressData = PROGRESS_STAGES.map((s) => ({
    label: s.label,
    value: (progress ?? []).find((p) => p.status === s.status)?.count ?? 0,
    color: s.color,
  }));
  const progressTotal = progressData.reduce((s, d) => s + d.value, 0);
  const lines = pday?.lines ?? [];
  const pLabel = pday
    ? pday.isToday
      ? "Today"
      : new Date(pday.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
    : "Today";
  const stageCount = (s: string) => progress?.find((p) => p.status === s)?.count ?? 0;
  const critMat = (alerts ?? []).filter((a) => a.category === "Material").length;
  const compact = (n: number) =>
    n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1_000)}K` : num(n);
  const pf = fin?.profitability ?? null;
  const topProfit = fin?.topOrders ?? [];
  const topShareMax = Math.max(1, ...topProfit.map((o) => o.sharePct));
  const money = currency === "BDT" ? "৳" : currency;
  // Receivables vs Payables: shurur khali mash bad, kom-pokkhe 4 mash dekhabe
  const rvpAll = fin?.trend ?? [];
  const rvpFirst = rvpAll.findIndex((m) => m.receivable > 0 || m.payable > 0);
  const rvp = rvpAll.slice(rvpFirst < 0 ? 0 : Math.min(rvpFirst, Math.max(rvpAll.length - 4, 0)));

  return (
    <div data-reveal-root className="space-y-5">
      <RevealObserver />
      {ov && <DashboardHero name={ov.name ?? "there"} company={ov.company} nowIso={ov.nowIso} />}

      {/* ---------- Top KPI row ---------- */}
        <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {ceo && (
          <KpiCard
            accent="blue"
            icon={ShoppingBag}
            label="Total Orders"
            value={num(ceo.totalOrders)}
            trend={trendOf(ov?.ordersTrend)}
            hint={factory ? `${factory.openProductionOrders} active production` : `${ceo.openOrders} open`}
          />
        )}
        {ceo && (
          <KpiCard
            accent="purple"
            icon={ClipboardList}
            label="Open Orders"
            value={num(ceo.openOrders)}
            hint={`${stageCount("CONFIRMED")} confirmed | ${stageCount("IN_PRODUCTION")} in production`}
          />
        )}
        {ceo && (
          <KpiCard
            accent="green"
            icon={Wallet}
            label="Order Value"
            value={`${ceo.currency} ${compact(ceo.orderValue)}`}
            trend={trendOf(ov?.valueTrend)}
            hint={`${ceo.currency} ${num(ceo.orderValue)}`}
          />
        )}
        {proc && (
          <KpiCard
            accent="orange"
            icon={TriangleAlert}
            label="Material Shortage"
            value={proc.materialShortage}
            tone={proc.materialShortage > 0 ? "warn" : "default"}
            hint={`${critMat} critical | ${Math.max(proc.materialShortage - critMat, 0)} normal`}
          />
        )}
        {merch && (
          <KpiCard
            accent="red"
            icon={Ship}
            label="Shipment Risk"
            value={merch.shipmentRisk}
            tone={merch.shipmentRisk > 0 ? "bad" : "default"}
            hint={`${merch.shipmentOverdue} overdue | ${Math.max(merch.shipmentRisk - merch.shipmentOverdue, 0)} nearing`}
          />
        )}
        {fin?.receivables ? (
          <KpiCard
            accent="teal"
            icon={Banknote}
            label="Receivables"
            value={`${currency} ${compact(fin.receivables.outstanding)}`}
            tone={fin.receivables.overdue > 0 ? "warn" : "default"}
            hint={`${currency} ${num(fin.receivables.outstanding)} | ${fin.receivables.overdue} overdue`}
          />
        ) : (
          ceo && (
            <KpiCard
              accent="teal"
              icon={PackageOpen}
              label="Material Exposure"
              value={`${ceo.currency} ${compact(ceo.materialExposure)}`}
              hint="Open PO, not yet received"
            />
          )
        )}
      </div>

      {/* ---------- Row 2: Order progress / Production overview / Production vs target ---------- */}
      <div className="stagger stagger-sides grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
        <Panel title="Order progress" subtitle="Overall order status" href="/orders">
          {progressTotal === 0 ? (
            <EmptyState>
              No orders yet.
              <Link href="/orders/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                Create first order
              </Link>
            </EmptyState>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <DonutChart data={progressData} centerValue={progressTotal} centerLabel="Total orders" />
              <ul className="min-w-40 flex-1 space-y-2 text-sm">
                {progressData.map((d, i) => (
                  <li
                    key={d.label}
                    className="item-in flex items-center justify-between gap-3 border-b pb-2 last:border-0"
                    style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.label}
                    </span>
                    <span className="text-muted-foreground">
                      {d.value} ({Math.round((d.value / progressTotal) * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Production overview" subtitle={`Line efficiency (${pLabel})`}>
          {lines.length === 0 ? (
            <EmptyState>No sewing output logged yet.</EmptyState>
          ) : (
            <div>
              <div className="mb-5 grid grid-cols-4 gap-3">
                {lines.slice(0, 4).map((l, i) => (
                  <div key={l.lineId} className="flex justify-center">
                    <RingGauge
                      pct={toPct(l.efficiencyPct)}
                      label={l.code}
                      color={RING_COLORS[i % RING_COLORS.length]}
                    />
                  </div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50/70 text-xs text-slate-500">
                    <th className="rounded-l-md px-3 py-2 text-left font-medium">Line</th>
                    <th className="py-2 text-left font-medium">Target</th>
                    <th className="py-2 text-left font-medium">Actual</th>
                    <th className="rounded-r-md py-2 pl-2 text-left font-medium">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="stagger stagger-fast">
                  {lines.slice(0, 4).map((l, i) => {
                    const p = toPct(l.efficiencyPct);
                    return (
                      <tr key={l.lineId} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-navy-800">{l.code}</td>
                        <td className="py-2.5 text-slate-700">{num(l.target)}</td>
                        <td className="py-2.5 text-slate-700">{num(l.output)}</td>
                        <td className="py-2.5 pl-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-9 text-xs font-semibold"
                              style={{ color: p >= 70 ? "#10b981" : "#f97316" }}
                            >
                              {Math.round(p)}%
                            </span>
                            <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="grow-x h-full rounded-full"
                                style={
                                  {
                                    width: `${Math.min(100, Math.max(2, p))}%`,
                                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                    "--d": "350ms",
                                  } as React.CSSProperties
                                }
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Production vs target"
          subtitle="Daily output (pcs)"
          aside={
            <div className="flex shrink-0 gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#cfd9e8]" /> Target
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Actual
              </span>
            </div>
          }
        >
          {lines.length === 0 ? (
            <EmptyState>No sewing output logged yet.</EmptyState>
          ) : (
            <PairedColumns
              items={lines.slice(0, 6).map((l) => ({ label: l.code, target: l.target, actual: l.output }))}
            />
          )}
        </Panel>

        <Panel title="Production vs target" subtitle="Daily output (pcs) by line" href="/sewing">
          {lines.length === 0 ? (
            <EmptyState>No sewing output logged today.</EmptyState>
          ) : (
            <PairedColumns
              items={lines.slice(0, 6).map((l) => ({ label: l.code, target: l.target, actual: l.output }))}
            />
          )}
        </Panel>
      </div>

      {/* ---------- Row 3: Recent orders / Alerts / Top buyers + CTA ---------- */}
      <div className="stagger stagger-sides grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        {orders && (
          <Panel icon={ShoppingBag} title="Recent orders" href="/orders">
            {orders.length === 0 ? (
              <EmptyState>
                No orders yet.
                <Link href="/orders/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                  Create first order
                </Link>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className={TH}>Order</th>
                      <th className={TH}>Buyer</th>
                      <th className={`${TH} text-right`}>Qty</th>
                      <th className={`${TH} pl-3`}>Status</th>
                      <th className={TH}>Ship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const st = statusOf(o.status);
                      return (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2.5">
                            <Link href={`/orders/${o.id}`} className="font-medium text-denim-600 hover:underline">
                              {o.orderNo}
                            </Link>
                          </td>
                          <td className="py-2.5">{o.buyer}</td>
                          <td className="py-2.5 text-right">{num(o.qty)}</td>
                          <td className="py-2.5 pl-3">
                            <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={pill(st.color)}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-muted-foreground">{fmtShort(o.shipDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {alerts && (
          <Panel
            icon={TriangleAlert}
            iconClass="bg-red-50 text-red-500"
            title="Alerts & exceptions"
            href="/alerts"
            badge={alerts.length}
          >
            {alerts.length === 0 ? (
              <EmptyState>No alerts. Everything is on track.</EmptyState>
            ) : (
              <ul className="space-y-1">
                {alerts.slice(0, 5).map((a) => {
                  const Icon = ALERT_ICON[a.category] ?? TriangleAlert;
                  return (
                    <li key={a.id}>
                      <Link href={a.href} className="flex gap-3 rounded-lg p-2 hover:bg-muted">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEV_ICON[a.severity]}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{a.title}</span>
                          <span className="line-clamp-2 block text-xs text-muted-foreground">{a.message}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.since, nowMs)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        <div className="space-y-4">
          {buyers && (
            <Panel icon={Users} title="Top 5 buyers by order value" href="/buyers">
              {buyers.length === 0 ? (
                <EmptyState>No confirmed orders yet.</EmptyState>
              ) : (
                <div className="space-y-4">
                  {buyers.map((b, i) => (
                    <BarRow
                      key={b.name}
                      rank={i + 1}
                      label={b.name}
                      right={`${currency} ${num(b.value)} (${b.pct}%)`}
                      pct={b.pct}
                      color={PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </div>
              )}
            </Panel>
          )}
          <div className="flex items-center gap-3 rounded-card border bg-denim-50 p-4 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-denim-700">Need to take action?</p>
              <p className="text-xs text-muted-foreground">Visit Alerts for all pending items and risks.</p>
            </div>
            <Link
              href="/alerts"
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              Go to Alerts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- Row 4: Upcoming shipments & T&A ---------- */}
      {shipments && (
        <Panel icon={Ship} title="Upcoming shipments & T&A" subtitle="Open orders, next milestone and risk" href="/shipments">
          {shipments.length === 0 ? (
            <EmptyState>No open orders with a ship date.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className={TH}>Order</th>
                    <th className={TH}>Buyer</th>
                    <th className={TH}>Ship date</th>
                    <th className={TH}>Milestone</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2.5">
                        <Link href={`/orders/${s.id}`} className="font-medium text-denim-600 hover:underline">
                          {s.orderNo}
                        </Link>
                      </td>
                      <td className="py-2.5">{s.buyer}</td>
                      <td className="py-2.5">
                        {fmtDate(s.shipDate)}
                        {s.daysLeft !== null && (
                          <span className="block text-[11px] text-muted-foreground">
                            {s.daysLeft < 0 ? `${-s.daysLeft}d overdue` : `in ${s.daysLeft}d`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {s.milestone ? (
                          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                            {s.milestone}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5">
                        {s.milestone ? (
                          <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={pill(s.milestoneLate ? "#ef4444" : "#10b981")}>
                            {s.milestoneLate ? "At risk" : "On track"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5">
                        {s.risk === "-" ? (
                          "-"
                        ) : (
                          <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={pill(s.risk === "High" ? "#ef4444" : "#f59e0b")}>
                            {s.risk}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ---------- Row 5: Material watchlist / Line performance ---------- */}
      <div className="stagger stagger-sides grid gap-4 lg:grid-cols-12">
        {watch && (
          <Panel
            icon={Boxes}
            title="Material & procurement watchlist"
            subtitle="Open purchase orders: required vs received"
            href="/purchase-orders"
            className="lg:col-span-7"
          >
            {watch.length === 0 ? (
              <EmptyState>No open purchase orders.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className={TH}>Material</th>
                      <th className={TH}>PO</th>
                      <th className={`${TH} text-right`}>Required</th>
                      <th className={`${TH} text-right`}>Received</th>
                      <th className={`${TH} pl-4`}>Status</th>
                      <th className={TH}>ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watch.map((w) => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{w.material}</td>
                        <td className="py-2.5 text-muted-foreground">{w.poNo}</td>
                        <td className="py-2.5 text-right">{num(w.required)}</td>
                        <td className="py-2.5 text-right">{num(w.available)}</td>
                        <td className="py-2.5 pl-4">
                          <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={pill(WATCH_COLOR[w.status])}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">{w.status === "OK" ? "-" : fmtShort(w.eta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {week && (
          <Panel
            icon={Gauge}
            title="Production line performance"
            subtitle="Line efficiency (last 7 days)"
            href="/sewing"
            className="lg:col-span-5"
          >
            {week.length === 0 ? (
              <EmptyState>No sewing output in the last 7 days.</EmptyState>
            ) : (
              <div className="space-y-4">
                {week.slice(0, 6).map((l, i) => (
                  <TargetBar key={l.lineId} label={l.code} pct={l.efficiencyPct} target={85} color={PALETTE[i % PALETTE.length]} delay={i * 90} />
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* ---------- Row 6: Business performance & insights ---------- */}
            
      {trend && (
        <Panel
          icon={TrendingUp}
          title="Business performance & insights"
          subtitle="Key financials and order profitability"
          href="/finance/profitability"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard icon={BarChart3} title="Monthly order value">
              <div className="flex items-end justify-between gap-2">
                <p className="font-heading text-2xl font-semibold">
                  {currency} {num(trend[trend.length - 1]?.value ?? 0)}
                </p>
                {ov?.valueTrend !== null && ov?.valueTrend !== undefined && (
                  <span className={`text-xs font-medium ${ov.valueTrend >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                    {ov.valueTrend >= 0 ? "↑" : "↓"} {Math.abs(ov.valueTrend)}% vs last month
                  </span>
                )}
              </div>
              <div className="mt-2">
                <Sparkline points={trend.map((t) => t.value)} />
              </div>
              <div className="flex justify-between px-2 text-[11px] text-muted-foreground">
                {trend.map((t) => (
                  <span key={t.label}>{t.label}</span>
                ))}
              </div>
            </InsightCard>
            {fin?.trend && (
              <InsightCard
                icon={Wallet}
                iconClass="bg-indigo-500 text-white"
                title="Receivables vs Payables"
                subtitle="Monthly comparison"
                aside={
                  <div className="flex shrink-0 gap-3 pt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Receivables
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      Payables
                    </span>
                  </div>
                }
              >
                {rvp.every((m) => m.receivable === 0 && m.payable === 0) ? (
                  <EmptyState>No posted invoices yet.</EmptyState>
                ) : (
                  <DualBars
                    items={rvp.map((m) => ({ label: m.label, a: m.receivable, b: m.payable }))}
                    aLabel="Receivables"
                    bLabel="Payables"
                  />
                )}
              </InsightCard>
            )}

            {pf && (
              <InsightCard icon={PieChart} iconClass="bg-teal-500 text-white" title="Order profitability">
                {pf.revenue === 0 ? (
                  <EmptyState>No posted invoices yet.</EmptyState>
                ) : (
                  <div className="flex flex-wrap items-center gap-5">
                    <DonutChart
                      size={136}
                      valueSize={30}
                      labelSize={14}
                      data={
                        pf.hasCost
                          ? [
                              { label: "Profit", value: Math.max(pf.profit, 0), color: "#14b8a6" },
                              { label: "Cost", value: pf.cost, color: "#3b82f6" },
                            ]
                          : [{ label: "Revenue", value: pf.revenue, color: "#cbd5e1" }]
                      }
                      centerValue={pf.hasCost ? `${pf.marginPct}%` : "—"}
                      centerLabel={pf.hasCost ? "Gross margin" : "No cost yet"}
                    />
                    <ul className="min-w-32 flex-1 space-y-3 text-sm">
                      {[
                        { label: "Profit", value: pf.profit, color: "#14b8a6", show: pf.hasCost },
                        { label: "Cost", value: pf.cost, color: "#3b82f6", show: true },
                        { label: "Revenue", value: pf.revenue, color: "#cbd5e1", show: true },
                      ]
                        .filter((r) => r.show)
                        .map((r) => (
                          <li
                            key={r.label}
                            className="flex items-center justify-between gap-2 border-b pb-2.5 last:border-0 last:pb-0"
                          >
                            <span className="flex items-center gap-2 text-slate-600">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                              {r.label}
                            </span>
                            <span className="font-semibold text-navy-800">
                              {money} {num(r.value)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </InsightCard>
            )}

            {pf && (
              <InsightCard icon={Trophy} iconClass="bg-violet-500 text-white" title="Top 5 profit making orders">
                {!pf.hasCost ? (
                  <EmptyState>Cost not booked yet, so profit cannot be calculated.</EmptyState>
                ) : topProfit.length === 0 ? (
                  <EmptyState>No profitable orders yet.</EmptyState>
                ) : (
                  <div className="space-y-4">
                    {topProfit.map((o, i) => (
                      <RankRow
                        key={o.orderId}
                        rank={i + 1}
                        label={o.orderNo}
                        pct={o.sharePct}
                        bar={(o.sharePct / topShareMax) * 100}
                        color={PALETTE[i % PALETTE.length]}
                        hint={`${money} ${num(o.profit)} profit, ${o.marginPct}% margin`}
                      />
                    ))}
                  </div>
                )}
              </InsightCard>
            )}
          </div>
        </Panel>
      )}

      {/* ---------- Merchandising ---------- */}
      {merch && (
        <Panel
          icon={Shirt}
          iconClass="bg-blue-100 text-blue-700"
          className="bg-blue-50/40"
          title="Merchandising"
          subtitle="Order & production coordination"
          href="/orders"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={CalendarClock}
              label="T&A Risk"
              info="T&A milestones that are delayed or at risk"
              value={merch.tnaRisk}
              sub="Milestones at risk"
              theme={merch.tnaRisk > 0 ? "red" : "green"}
              badge={merch.tnaRisk > 0 ? { label: "High", theme: "red" } : { label: "OK", theme: "green" }}
              href="/tna/risk"
              linkLabel="View details"
            />
            <MetricCard
              icon={Timer}
              label="Sample Delays"
              info="Samples past their due date and not yet approved"
              value={merch.sampleDelays}
              sub="Samples delayed"
              theme={merch.sampleDelays > 0 ? "amber" : "green"}
              badge={merch.sampleDelays > 0 ? { label: "Medium", theme: "amber" } : { label: "OK", theme: "green" }}
              href="/samples"
              linkLabel="View details"
            />
            <MetricCard
              icon={Layers}
              label="Material Booking"
              info="MRP shows a shortage but no purchase requisition yet"
              value={merch.materialBookingPending}
              sub="Shortage, no PR yet"
              theme="blue"
              badge={{ label: "Info", theme: "blue" }}
              href="/material-requirements"
              linkLabel="View details"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Buyer Approvals"
              info="Samples waiting for the buyer's decision"
              value={merch.buyerApprovals}
              sub="Samples at buyer"
              theme="violet"
              badge={{ label: "Low", theme: "green" }}
              href="/samples"
              linkLabel="View details"
            />
          </div>
        </Panel>
      )}

      {/* ---------- Procurement ---------- */}
      {proc && (
        <Panel
          icon={Box}
          iconClass="bg-blue-100 text-blue-700"
          className="bg-blue-50/40"
          title="Procurement"
          subtitle="Material, purchase and supplier management"
          href="/purchase-orders"
        >
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              icon={FileText}
              label="Open PR"
              info="Purchase requisitions submitted or approved, not yet ordered"
              value={proc.openPr}
              sub="Purchase Requisition"
              theme="blue"
              corner={ArrowRight}
              href="/prs"
              linkLabel="View all PR"
            />
            <MetricCard
              icon={ShoppingCart}
              label="Open PO"
              info="Purchase orders still in progress"
              value={proc.openPo}
              sub={fin && ceo ? `Not yet received: ${ceo.currency} ${num(ceo.materialExposure)}` : "Purchase Orders"}
              theme="teal"
              corner={ArrowRight}
              href="/purchase-orders"
              linkLabel="View all PO"
            />
            <MetricCard
              icon={TriangleAlert}
              label="Supplier Delays"
              info="Open POs past the supplier's promised date"
              value={proc.supplierDelays}
              sub="Delayed shipments"
              theme={proc.supplierDelays > 0 ? "red" : "green"}
              corner={ArrowRight}
              href="/follow-ups"
              linkLabel="View details"
            />
            <MetricCard
              icon={Wallet}
              label="Spend (Month)"
              info="Value of POs raised this month"
              value={`${proc.currency} ${num(proc.spendThisMonth)}`}
              sub="Total spend this month"
              theme="violet"
              corner={TrendingUp}
              href="/finance/payables"
              linkLabel="View report"
            />
            <MetricCard
              icon={TrendingUp}
              label="Spend (Year)"
              info="Value of POs raised this year"
              value={`${proc.currency} ${num(proc.spendThisYear)}`}
              sub="Total spend this year"
              theme="blue"
              corner={TrendingUp}
              href="/analytics"
              linkLabel="View report"
            />
          </div>
        </Panel>
      )}

      {/* ---------- Footer ---------- */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
        <span>
          <span className="font-heading font-bold text-foreground">
            MERCH<span className="text-blue-600">FLOW</span>
          </span>{" "}
          © {year} All rights reserved.
        </span>
        <span>Garments &amp; Textile ERP</span>
      </footer>
    </div>
  );
}