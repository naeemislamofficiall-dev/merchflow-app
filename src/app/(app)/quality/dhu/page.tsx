import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { qualityAnalyticsService } from "@/services/quality-analytics.service";
import type { InspectionStage } from "@/generated/prisma/enums";

const STAGES: InspectionStage[] = ["INCOMING", "FABRIC", "CUTTING", "INLINE", "ENDLINE", "FINISHING", "FINAL", "PRESHIPMENT"];
const f1 = (n: number) => n.toFixed(2);

export default async function DhuPage({ searchParams }: { searchParams: Promise<{ days?: string; stage?: string }> }) {
  const user = await requireUser();
  if (!can(user, "qc.view")) redirect("/dashboard");
  const sp = await searchParams;
  const days = [7, 14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const stage = (STAGES as string[]).includes(sp.stage ?? "") ? (sp.stage as InspectionStage) : "ENDLINE";
  const r = await qualityAnalyticsService.dhuReport({ days, stage });
  const maxDhu = Math.max(1, ...r.days.map((d) => d.dhu));
  const maxQty = Math.max(1, ...r.pareto.map((p) => p.qty));

  return (
    <div className="space-y-5">
      <PageHeader title="DHU & defect Pareto" description="DHU = defects per 100 inspected pieces. Numbers come straight from recorded inspections." />
      <form className="flex flex-wrap gap-2 text-sm">
        <select name="stage" defaultValue={stage} className="rounded-md border bg-background px-3 py-2">
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="days" defaultValue={String(days)} className="rounded-md border bg-background px-3 py-2">
          {[7, 14, 30, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
        <button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">Apply</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Overall DHU", f1(r.overall)], ["Inspected pcs", r.sample.toLocaleString()], ["Defects", r.defects.toLocaleString()], ["Inspections", String(r.inspections)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="text-2xl font-semibold">{v}</div></div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Daily DHU</h2>
        <div className="space-y-1 rounded-xl border p-3">
          {r.days.map((d) => (
            <div key={d.date} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0">{d.date}</span>
              <div className="h-4 flex-1 rounded bg-muted"><div className="h-4 rounded bg-primary" style={{ width: `${(d.dhu / maxDhu) * 100}%` }} /></div>
              <span className="w-14 text-right">{f1(d.dhu)}</span>
            </div>
          ))}
          {r.days.length === 0 && <p className="text-sm text-muted-foreground">No inspections in this period.</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">DHU by line</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Line", "Inspected", "Defects", "DHU"].map((x) => <th key={x} className="px-3 py-2 text-left">{x}</th>)}</tr></thead>
            <tbody>{r.lines.map((l) => (
              <tr key={l.name} className="border-t"><td className="px-3 py-2">{l.name}</td><td className="px-3 py-2">{l.sample}</td><td className="px-3 py-2">{l.defects}</td><td className="px-3 py-2 font-medium">{f1(l.dhu)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Defect Pareto</h2>
        <div className="space-y-1 rounded-xl border p-3">
          {r.pareto.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className="w-56 shrink-0 truncate" title={p.name}>{p.name}</span>
              <div className="h-4 flex-1 rounded bg-muted"><div className="h-4 rounded bg-amber-500" style={{ width: `${(p.qty / maxQty) * 100}%` }} /></div>
              <span className="w-10 text-right">{p.qty}</span>
              <span className="w-24 text-right text-muted-foreground">cum {p.cumPct.toFixed(0)}%</span>
            </div>
          ))}
          {r.pareto.length === 0 && <p className="text-sm text-muted-foreground">No defects recorded.</p>}
        </div>
      </section>
    </div>
  );
}
