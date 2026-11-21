import Link from "next/link";
import { CircleAlert, CircleCheck, ClipboardList, Percent, Plus, Scale } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { aqlService } from "@/services/aql.service";
import { AqlTable, type AqlRow } from "./aql-table";

const n = (v: number) => v.toLocaleString("en-US");

export default async function AqlPage() {
  const [list, rate] = await Promise.all([aqlService.list(), aqlService.passRate()]);

  const rows: AqlRow[] = list.map((a) => ({
    id: a.id,
    inspectionNo: a.inspectionNo,
    stage: a.stage.toLowerCase(),
    lotSize: a.lotSize,
    sampleSize: a.sampleSize,
    found:
      a.foundMajor === null
        ? "-"
        : `${a.foundCritical ?? 0} / ${a.foundMajor} / ${a.foundMinor ?? 0}`,
    result: a.result,
    createdAt: a.createdAt.toISOString().slice(0, 10),
  }));

  const failed = Math.max(rate.total - rate.passed, 0);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Scale className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">AQL Inspections</h1>
              <p className="text-sm text-slate-500">
                Final and pre-shipment inspection. A failed final inspection blocks the shipment
              </p>
            </div>
          </div>
          <Link
            href="/quality/aql/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New AQL Inspection
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard theme="blue" icon={ClipboardList} label="Completed" value={n(rate.total)} sub="AQL inspections done" />
        <StatCard theme="green" icon={CircleCheck} label="Passed" value={n(rate.passed)} sub="Met the AQL limit" />
        <StatCard
          theme={failed > 0 ? "red" : "green"}
          icon={CircleAlert}
          label="Failed"
          value={n(failed)}
          sub="Completed minus passed"
        />
        <StatCard
          theme="violet"
          icon={Percent}
          label="Pass Rate"
          value={rate.passRatePct === null ? "-" : `${rate.passRatePct}%`}
          sub="Passed out of completed"
        />
      </div>

      <AqlTable rows={rows} />
    </div>
  );
}