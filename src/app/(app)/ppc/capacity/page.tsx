import Link from "next/link";
import { BarChart3, CalendarDays, CircleCheck, Gauge, Settings } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { PageHeader } from "@/components/layout/page-header";
import { dateKey } from "@/lib/capacity-calc";
import { ppcService } from "@/services/ppc.service";
import { CapacityTable } from "./capacity-table";

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const field =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const n = (v: number) => v.toLocaleString("en-US");

export default async function CapacityPage(props: {
  searchParams: Promise<{ factoryId?: string; from?: string; to?: string; mode?: string }>;
}) {
  const sp = await props.searchParams;
  const options = await ppcService.formOptions();
  const factoryId = sp.factoryId || options.factories[0]?.id;

  if (!factoryId) {
    return (
      <div className="space-y-4">
        <PageHeader title="Capacity vs load" description="Available minutes against planned load" />
        <p className="text-sm text-muted-foreground">No factory is available in your scope.</p>
      </div>
    );
  }

  const mode = sp.mode === "daily" ? "daily" : "weekly";
  const from = sp.from || dateKey(new Date());
  const to = sp.to || addDays(from, 27);
  const t = await ppcService.capacityTable({ factoryId, from, to, mode });

  const gapBad = t.totals.gapMinutes < 0;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <BarChart3 className="h-8 w-8" strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Capacity vs Load</h1>
              <p className="text-sm text-slate-500">
                Compare available capacity with production load across lines and weeks.
              </p>
            </div>
          </div>
          <Link
            href={`/ppc?factoryId=${factoryId}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <CalendarDays className="h-4 w-4" /> Planning Board
          </Link>
        </header>
      </PageBand>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">Factory</span>
          <select name="factoryId" defaultValue={factoryId} className={`${field} min-w-56`}>
            {options.factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">From</span>
          <input type="date" name="from" defaultValue={from} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">To</span>
          <input type="date" name="to" defaultValue={to} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium text-navy-800">View</span>
          <select name="mode" defaultValue={mode} className={field}>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          Show
        </button>
      </form>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          theme="blue"
          icon={Settings}
          label="Available Capacity"
          value={n(t.totals.availableMinutes)}
          unit="min"
          sub="Operators x minutes x efficiency"
        />
        <StatCard
          theme="blue"
          icon={CalendarDays}
          label="Planned Load"
          value={n(t.totals.plannedMinutes)}
          unit="min"
          sub="Allocated to lines"
        />
        <StatCard
          theme="green"
          icon={CircleCheck}
          label="Not Planned Yet"
          value={n(t.totals.unplannedMinutes)}
          unit="min"
          sub="Still to be allocated"
        />
        <StatCard
          theme={gapBad ? "red" : "green"}
          icon={Gauge}
          label="Capacity Gap"
          value={n(t.totals.gapMinutes)}
          unit="min"
          sub={`Required ${n(t.totals.requiredMinutes)} min`}
        />
      </div>

      {t.missingSmv.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          No operation bulletin (SMV) for:{" "}
          {t.missingSmv.map((m) => `${m.productionNo} (${m.styleNo})`).join(", ")}. Their load is not counted.
        </p>
      )}

      <CapacityTable
        key={`${factoryId}|${from}|${to}|${mode}`}
        title={mode === "weekly" ? "Weekly Capacity by Line" : "Daily Capacity by Line"}
        bucketLabel={mode === "weekly" ? "Week Starting" : "Date"}
        rows={t.rows.map((r) => ({
          bucket: r.bucket,
          lineId: r.lineId,
          code: r.code,
          availableMinutes: r.availableMinutes,
          plannedMinutes: r.plannedMinutes,
          gapMinutes: r.gapMinutes,
          loadPct: r.loadPct,
          overloaded: r.overloaded,
          missingData: !!r.missingData,
        }))}
      />

      <p className="text-xs text-slate-500">
        Available = operators x minutes x efficiency, without weekly off days and holidays. Gap = available - required.
      </p>
    </div>
  );
}