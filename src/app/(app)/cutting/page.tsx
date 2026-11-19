import Link from "next/link";
import { ClipboardList, Layers, Plus, Scissors, Shirt } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { cuttingService } from "@/services/cutting.service";
import { CuttingTable, type CutPlanRow } from "./cutting-table";

const n = (v: number) => v.toLocaleString("en-US");

export default async function CuttingPage() {
  const plans = await cuttingService.plans();

  const rows: CutPlanRow[] = plans.map((p) => ({
    id: p.id,
    cutPlanNo: p.cutPlanNo,
    productionNo: p.productionOrder.productionNo,
    color: p.color,
    plannedPlies: p.plannedPlies,
    plannedOutput: p.plannedOutput,
    lays: `${p.lays.filter((l) => l.status === "CUT").length} / ${p.lays.length}`,
    status: p.status,
  }));

  const totalOutput = plans.reduce((s, p) => s + p.plannedOutput, 0);
  const totalPlies = plans.reduce((s, p) => s + p.plannedPlies, 0);
  const totalLays = plans.reduce((s, p) => s + p.lays.length, 0);
  const cutLays = plans.reduce((s, p) => s + p.lays.filter((l) => l.status === "CUT").length, 0);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Scissors className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Cutting</h1>
              <p className="text-sm text-slate-500">Cut plans, lays and bundles for released production orders.</p>
            </div>
          </div>
          <Link
            href="/cutting/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Cut Plan
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard theme="blue" icon={ClipboardList} label="Total Cut Plans" value={n(plans.length)} sub="All cut plans" />
        <StatCard theme="green" icon={Shirt} label="Planned Output" value={n(totalOutput)} unit="pcs" sub="Across all cut plans" />
        <StatCard theme="orange" icon={Scissors} label="Lays Cut" value={`${n(cutLays)} / ${n(totalLays)}`} sub="Cut lays out of all lays" />
        <StatCard theme="violet" icon={Layers} label="Planned Plies" value={n(totalPlies)} sub="Across all cut plans" />
      </div>

      <CuttingTable rows={rows} />
    </div>
  );
}