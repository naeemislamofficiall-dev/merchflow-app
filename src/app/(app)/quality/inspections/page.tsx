import Link from "next/link";
import { Bug, CircleAlert, ClipboardCheck, ClipboardList, Layers, ListFilter, Percent, Plus, Wrench } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { qualityService } from "@/services/quality.service";
import { InspectionsTable, type InspectionRow } from "./inspections-table";

const STAGES = ["INCOMING", "FABRIC", "CUTTING", "INLINE", "ENDLINE", "FINISHING"] as const;
type Stage = (typeof STAGES)[number];

const n = (v: number) => v.toLocaleString("en-US");
const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3 text-[15px] text-navy-800";

export default async function InspectionsPage(props: { searchParams: Promise<{ stage?: string }> }) {
  const sp = await props.searchParams;
  const stage = STAGES.find((s) => s === sp.stage) as Stage | undefined;

  const [summary, list] = await Promise.all([
    qualityService.summary(stage ? { stage } : {}),
    qualityService.list(stage ? { stage } : {}),
  ]);

  const rows: InspectionRow[] = list.map((i) => {
    const defects = i.occurrences.reduce((s, o) => s + o.quantity, 0);
    return {
      id: i.id,
      inspectionNo: i.inspectionNo,
      stage: i.stage.toLowerCase(),
      operation: i.operation ?? "",
      sampleSize: i.sampleSize,
      defectiveQty: i.defectiveQty,
      defects,
      dhu: i.sampleSize > 0 ? `${((defects / i.sampleSize) * 100).toFixed(1)}%` : "-",
      inspectedAt: i.inspectedAt.toISOString().slice(0, 16).replace("T", " "),
    };
  });

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <ClipboardCheck className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Inspections</h1>
              <p className="text-sm text-slate-500">
                Quality checks at every stage. DHU = defects per 100 pieces checked
              </p>
            </div>
          </div>
          <Link
            href="/quality/inspections/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Inspection
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <StatCard theme="blue" icon={ClipboardList} label="Inspections" value={n(summary.inspections)} sub="Total inspections" />
        <StatCard theme="green" icon={Layers} label="Pieces Checked" value={n(summary.checked)} unit="pcs" sub="Sample size, all inspections" />
        <StatCard theme="orange" icon={Bug} label="Defects Found" value={n(summary.defects)} sub="All defect occurrences" />
        <StatCard
          theme="violet"
          icon={Percent}
          label="DHU"
          value={summary.dhu === null ? "-" : `${summary.dhu}%`}
          sub="Defects per 100 pieces"
        />
        <StatCard
          theme="blue"
          icon={Wrench}
          label="Rework %"
          value={summary.reworkPct === null ? "-" : `${summary.reworkPct}%`}
          sub={`Repaired ${n(summary.repaired)} · rejected ${n(summary.rejected)}`}
        />
        <StatCard
          theme={summary.openDefects > 0 ? "red" : "green"}
          icon={CircleAlert}
          label="Open Defects"
          value={n(summary.openDefects)}
          sub="Not yet closed"
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div>
          <label htmlFor="stage" className="mb-1 block text-sm font-semibold text-navy-800">
            Stage
          </label>
          <div className="relative">
            <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            <select id="stage" name="stage" defaultValue={stage ?? ""} className={`${field} min-w-52 pl-10 capitalize`}>
              <option value="">All stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <ListFilter className="h-4 w-4" /> Filter
        </button>
      </form>

      {summary.pareto.length > 0 && (
        <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
          <div className="bg-navy-800 px-5 py-3.5 text-white">
            <h2 className="font-heading text-lg font-semibold">Defect Pareto</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-navy-800">
                <tr>
                  <th className={th}>Defect</th>
                  <th className={`${th} text-right`}>Count</th>
                  <th className={`${th} text-right`}>Share</th>
                  <th className={`${th} text-right`}>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {summary.pareto.map((p) => (
                  <tr key={p.name} className="border-t border-slate-100">
                    <td className={`${td} font-medium`}>{p.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{p.count}</td>
                    <td className={`${td} text-right tabular-nums`}>{p.pct}%</td>
                    <td className={`${td} text-right tabular-nums`}>{p.cumulativePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InspectionsTable rows={rows} />
    </div>
  );
}