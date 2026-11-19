import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Gauge,
  Layers,
  RotateCcw,
  Search,
  Shirt,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { dateKey } from "@/lib/capacity-calc";
import { ppcService } from "@/services/ppc.service";
import { AllocateForm, AllocationList, HolidayManager } from "./ppc-controls";

const TZ = "Asia/Dhaka";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const nf = new Intl.NumberFormat("en-US");

const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const utc = (key: string) => new Date(`${key}T00:00:00.000Z`);
const addDays = (key: string, n: number) => {
  const d = utc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / DAY_MS);
const weekday = (key: string) => utc(key).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
const pretty = (key: string) =>
  utc(key).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Prottek production order-er jonno alada rong (Gantt-style bar)
const PALETTE = [
  "bg-blue-100 border-blue-300",
  "bg-emerald-100 border-emerald-300",
  "bg-violet-100 border-violet-300",
  "bg-amber-100 border-amber-300",
  "bg-pink-100 border-pink-300",
  "bg-cyan-100 border-cyan-300",
];

const VIEWS = [
  { label: "Day", days: 1 },
  { label: "Week", days: 7 },
  { label: "Month", days: 31 },
];

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-ink shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

function Header({ factoryId }: { factoryId?: string }) {
  return (
    <PageBand>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <CalendarDays className="h-8 w-8" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Production Planning</h1>
            <p className="text-sm text-slate-500">
              Plan production lines, allocate orders and manage capacity efficiently.
            </p>
          </div>
        </div>
        {factoryId && (
          <Link
            href={`/ppc/capacity?factoryId=${factoryId}`}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Gauge className="h-4 w-4" /> Capacity vs Load
          </Link>
        )}
      </header>
    </PageBand>
  );
}

function SummaryItem({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-navy-800">{value}</p>
    </div>
  );
}

export default async function PpcPage(props: {
  searchParams: Promise<{ factoryId?: string; from?: string; to?: string; po?: string }>;
}) {
  const sp = await props.searchParams;
  const options = await ppcService.formOptions();
  const factoryId = sp.factoryId || options.factories[0]?.id;

  if (!factoryId) {
    return (
      <div className="space-y-5">
        <Header />
        <p className="text-sm text-muted-foreground">No factory is available in your scope.</p>
      </div>
    );
  }

  const from = sp.from && DATE.test(sp.from) ? sp.from : todayKey();
  const toRaw = sp.to && DATE.test(sp.to) ? sp.to : addDays(from, 6);
  const days = Math.min(Math.max(diffDays(from, toRaw) + 1, 1), 31);
  const to = addDays(from, days - 1);

  const [board, unplanned, holidays] = await Promise.all([
    ppcService.board({ factoryId, from, to }),
    ppcService.unplanned({ factoryId }),
    ppcService.listHolidays({ factoryId, from, to }),
  ]);

  const qs = (p: Record<string, string>) => `/ppc?${new URLSearchParams({ factoryId, ...p }).toString()}`;
  const viewHref = (n: number) => qs({ from, to: addDays(from, n - 1) });
  const prevHref = qs({ from: addDays(from, -days), to: addDays(from, -1) });
  const nextHref = qs({ from: addDays(from, days), to: addDays(from, days * 2 - 1) });

  const lineOpts = options.lines
    .filter((l) => l.factoryId === factoryId)
    .map((l) => ({ id: l.id, label: `${l.code} - ${l.name}` }));
  const lineCode = new Map(board.lines.map((l) => [l.id, l.code]));
  const colorOf = new Map<string, string>();
  for (const a of board.allocations) {
    if (!colorOf.has(a.productionOrderId)) colorOf.set(a.productionOrderId, PALETTE[colorOf.size % PALETTE.length]);
  }
  const byCell = new Map<string, typeof board.allocations>();
  for (const a of board.allocations) {
    const k = `${a.lineId}|${a.dateKey}`;
    byCell.set(k, [...(byCell.get(k) ?? []), a]);
  }
  const overloadedCount = board.lines.reduce(
    (s, l) => s + Object.values(l.cells).filter((c) => c.overloaded).length,
    0
  );

  const plannedInRange = board.allocations.reduce((s, a) => s + a.plannedQty, 0);
  const orderQty = unplanned.reduce((s, u) => s + u.quantity, 0);
  const allocatedQty = unplanned.reduce((s, u) => s + u.allocatedQty, 0);
  const leftQty = unplanned.reduce((s, u) => s + u.remainingQty, 0);
  const poDefault = unplanned.some((u) => u.id === sp.po) ? (sp.po ?? "") : "";

  return (
    <div className="stagger space-y-5">
      <Header factoryId={factoryId} />

            <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          big
          plain
          theme="blue"
          icon={ClipboardList}
          label="Orders to plan"
          value={String(unplanned.length)}
          sub="Production orders with qty left"
        />
        <StatCard
          big
          plain
          theme="green"
          icon={Shirt}
          label="Planned qty (pcs)"
          value={nf.format(plannedInRange)}
          sub={`${from} to ${to}`}
        />
        <StatCard
          big
          plain
          theme="violet"
          icon={Layers}
          label="Qty left to plan (pcs)"
          value={nf.format(leftQty)}
          sub="Across orders still to plan"
        />
        <StatCard
          big
          plain
          theme={overloadedCount > 0 ? "red" : "green"}
          icon={overloadedCount > 0 ? TriangleAlert : CircleCheck}
          label="Overloaded line-days"
          value={String(overloadedCount)}
          sub={overloadedCount > 0 ? "In this date range" : "Nothing overloaded"}
        />
      </div>

      <form
        key={`${factoryId}|${from}|${to}`}
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          Factory
          <select name="factoryId" defaultValue={factoryId} className={cn(field, "min-w-52")}>
            {options.factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          From Date
          <input type="date" name="from" defaultValue={from} className={field} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          To Date
          <input type="date" name="to" defaultValue={to} className={field} />
        </label>
        <div className="ml-auto flex gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} /> Search
          </button>
          <Link
            href="/ppc"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Link>
        </div>
      </form>

      {overloadedCount > 0 && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {overloadedCount} line-day(s) are overloaded in this range.
        </p>
      )}

      <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-heading text-xl font-semibold text-navy-800">
            <CalendarDays className="h-5 w-5 text-blue-600" /> Planning Board
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm font-semibold">
              {VIEWS.map((v) => (
                <Link
                  key={v.label}
                  href={viewHref(v.days)}
                  scroll={false}
                  className={cn(
                    "px-4 py-2 transition-colors",
                    days === v.days ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {v.label}
                </Link>
              ))}
            </div>
            <div className="inline-flex items-center gap-2">
              <Link
                href={prevHref}
                scroll={false}
                aria-label="Previous range"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="min-w-40 text-center text-sm font-medium text-navy-800">
                {pretty(from)} – {pretty(to)}, {to.slice(0, 4)}
              </span>
              <Link
                href={nextHref}
                scroll={false}
                aria-label="Next range"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {board.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">This factory has no active lines.</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-navy-800 px-3 py-2 text-left font-semibold text-white">
                    Line
                  </th>
                  {board.days.map((d) => (
                    <th
                      key={d.key}
                      title={d.holiday ?? undefined}
                      className={cn(
                        "min-w-28 border-l border-white/10 px-2 py-2 text-center font-semibold text-white",
                        d.off ? "bg-slate-500" : "bg-navy-800"
                      )}
                    >
                      <div>{d.key.slice(5)}</div>
                      <div className="font-normal opacity-80">{weekday(d.key)}</div>
                      {d.holiday && <div className="font-normal">{d.holiday}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-2 align-top font-semibold text-navy-800">
                      {l.code}
                      <div className="font-normal text-slate-500">
                        {l.missingData ? "no operators" : `${l.minutesPerDay} min/day`}
                      </div>
                    </td>
                    {board.days.map((d) => {
                      const cell = l.cells[d.key];
                      const items = byCell.get(`${l.id}|${d.key}`) ?? [];
                      return (
                        <td
                          key={d.key}
                          className={cn(
                            "border-l border-t border-slate-100 p-1.5 align-top",
                            cell.overloaded ? "border-red-400 bg-red-50" : d.off ? "bg-slate-50" : ""
                          )}
                        >
                          <div className="space-y-1">
                            {items.map((a) => (
                              <div
                                key={a.id}
                                className={cn(
                                  "rounded border px-1.5 py-0.5",
                                  colorOf.get(a.productionOrderId),
                                  a.status === "RELEASED" ? "border-l-4" : "border-dashed"
                                )}
                                title={`${a.productionNo} / ${a.styleNo} / ${a.status}`}
                              >
                                {a.productionNo.slice(-9)} · {a.plannedQty}
                              </div>
                            ))}
                            {cell.plannedMinutes > 0 && (
                              <div className={cell.overloaded ? "font-medium text-red-700" : "text-slate-500"}>
                                {cell.plannedMinutes}/{cell.availableMinutes} min
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Dashed bar = planned. Solid left edge = released. Red = overloaded (a warning, not a block).
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section
          id="add-allocation"
          className="scroll-mt-6 rounded-card border border-slate-100 bg-white p-5 shadow-card lg:col-span-2"
        >
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
            <Layers className="h-5 w-5 text-blue-600" /> Add Allocation
          </h2>
          <div className="mt-4">
            <AllocateForm
              key={poDefault || "none"}
              defaultDate={from}
              defaultOrderId={poDefault}
              lines={lineOpts}
              orders={unplanned.map((u) => ({
                id: u.id,
                label: `${u.productionNo} · ${u.styleNo} · ${u.remainingQty} pcs left${u.smv ? "" : " (no SMV)"}`,
              }))}
            />
          </div>
        </section>

        <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
            <ClipboardList className="h-5 w-5 text-blue-600" /> Summary
          </h2>
          <p className="mt-1 text-xs text-slate-500">Orders still to plan</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SummaryItem icon={Shirt} tone="bg-blue-100 text-blue-600" label="Order qty" value={`${nf.format(orderQty)} pcs`} />
            <SummaryItem
              icon={CircleCheck}
              tone="bg-emerald-100 text-emerald-600"
              label="Allocated"
              value={`${nf.format(allocatedQty)} pcs`}
            />
            <SummaryItem icon={Layers} tone="bg-violet-100 text-violet-600" label="Left" value={`${nf.format(leftQty)} pcs`} />
          </div>
        </section>
      </div>

      <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
            <ClipboardList className="h-5 w-5 text-blue-600" /> Production Orders (Still to Plan) ({unplanned.length})
          </h2>
          <Link href="/production-orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            View All →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          {unplanned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every open production order is fully allocated.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-navy-800">
                <tr>
                  {["Production no", "Order", "Style", "Order Qty", "Allocated", "Left", "Dates", "SMV", "Priority", "Action"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2.5 font-semibold">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {unplanned.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/production-orders/${u.id}`}
                        className="font-semibold text-navy-800 hover:text-blue-600 hover:underline"
                      >
                        {u.productionNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{u.orderNo}</td>
                    <td className="px-3 py-2.5">{u.styleNo}</td>
                    <td className="px-3 py-2.5 tabular-nums">{nf.format(u.quantity)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{nf.format(u.allocatedQty)}</td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums">{nf.format(u.remainingQty)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {dateKey(u.startDate)} to {dateKey(u.endDate)}
                    </td>
                    <td className={cn("px-3 py-2.5", !u.smv && "font-medium text-amber-700")}>{u.smv ?? "missing"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{u.priority}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`${qs({ from, to, po: u.id })}#add-allocation`}
                        className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        Plan Now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="mb-4 font-heading text-lg font-semibold text-navy-800">Allocations in this range</h2>
        <AllocationList
          lines={lineOpts}
          items={board.allocations.map((a) => ({
            id: a.id,
            productionNo: a.productionNo,
            styleNo: a.styleNo,
            lineId: a.lineId,
            lineCode: lineCode.get(a.lineId) ?? "",
            dateKey: a.dateKey,
            plannedQty: a.plannedQty,
            status: a.status,
          }))}
        />
      </section>

      <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="mb-4 font-heading text-lg font-semibold text-navy-800">Factory holidays</h2>
        <HolidayManager
          factoryId={factoryId}
          holidays={holidays.map((h) => ({ id: h.id, dateKey: dateKey(h.date), reason: h.reason }))}
        />
      </section>
    </div>
  );
}