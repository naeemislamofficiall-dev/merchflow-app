import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { dateKey } from "@/lib/capacity-calc";
import { ppcService } from "@/services/ppc.service";

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const field = "h-9 rounded-md border bg-background px-2 text-sm";
const n = (v: number) => v.toLocaleString("en-US");

function Kpi({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${bad ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Capacity vs load"
        description="Available = operators x minutes x efficiency, without weekly off days and holidays. Gap = available - required."
        actions={
          <Link href={`/ppc?factoryId=${factoryId}`} className={buttonVariants({ variant: "outline" })}>
            Planning board
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Factory</span>
          <select name="factoryId" defaultValue={factoryId} className={field}>
            {options.factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">From</span>
          <input type="date" name="from" defaultValue={from} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">To</span>
          <input type="date" name="to" defaultValue={to} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">View</span>
          <select name="mode" defaultValue={mode} className={field}>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Show
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Available (min)" value={n(t.totals.availableMinutes)} />
        <Kpi label="Planned (min)" value={n(t.totals.plannedMinutes)} />
        <Kpi label="Not planned yet (min)" value={n(t.totals.unplannedMinutes)} />
        <Kpi label="Required (min)" value={n(t.totals.requiredMinutes)} />
        <Kpi label="Capacity gap (min)" value={n(t.totals.gapMinutes)} bad={t.totals.gapMinutes < 0} />
      </div>

      {t.missingSmv.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No operation bulletin (SMV) for: {t.missingSmv.map((m) => `${m.productionNo} (${m.styleNo})`).join(", ")}. Their load is not counted.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "weekly" ? "Weekly" : "Daily"} capacity by line</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {t.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">This factory has no active lines.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {[mode === "weekly" ? "Week starting" : "Date", "Line", "Available", "Planned", "Gap", "Load %"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={`${r.bucket}|${r.lineId}`} className={`border-t ${r.overloaded ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2">{r.bucket}</td>
                    <td className="px-3 py-2">
                      {r.code}
                      {r.missingData && <span className="ml-2 text-xs text-amber-700">no operators</span>}
                    </td>
                    <td className="px-3 py-2">{n(r.availableMinutes)}</td>
                    <td className="px-3 py-2">{n(r.plannedMinutes)}</td>
                    <td className={`px-3 py-2 ${r.gapMinutes < 0 ? "font-medium text-red-600" : ""}`}>{n(r.gapMinutes)}</td>
                    <td className="px-3 py-2">{r.loadPct === null ? "-" : `${r.loadPct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
