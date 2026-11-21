import { Activity, CircleCheck, Clock, Layers, Pause } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { wipService } from "@/services/wip.service";
import { WipTable, type WipRow } from "./wip-table";

const n = (v: number) => v.toLocaleString("en-US");

// SHUDHU SAJANO: sewing machine (data na). Chaile function ar <SewingMachineArt /> line ta muche dao
function SewingMachineArt() {
  return (
    <svg viewBox="0 0 160 90" className="h-24 w-44" aria-hidden="true">
      <rect x="4" y="80" width="116" height="8" rx="4" fill="#1e3a8a" />
      <path d="M14 80 V40 Q14 18 40 18 H88 Q104 18 104 34 V44 H78 V80 Z" fill="#1e3a8a" />
      <rect x="86" y="8" width="12" height="12" rx="2" fill="#1e3a8a" />
      <circle cx="46" cy="38" r="8" fill="#93c5fd" />
      <rect x="98" y="44" width="4" height="22" rx="2" fill="#1e3a8a" />
      <rect x="128" y="56" width="22" height="24" rx="4" fill="#bfdbfe" />
      <rect x="128" y="62" width="22" height="4" fill="#60a5fa" />
      <rect x="128" y="70" width="22" height="4" fill="#60a5fa" />
    </svg>
  );
}

export default async function WipPage() {
  const data = await wipService.open();

  const rows: WipRow[] = data.map((r) => ({
    id: r.productionOrderId,
    productionNo: r.productionNo,
    orderNo: r.orderNo,
    styleNo: r.styleNo,
    status: r.status,
    planned: r.planned,
    cut: r.cut,
    sewn: r.sewn,
    finished: r.finished,
    packed: r.packed,
    shipped: r.shipped,
    inSewing: r.balances.inSewing,
    inFinishing: r.balances.inFinishing,
  }));

  const count = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Activity className="h-8 w-8" strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">WIP</h1>
              <p className="text-sm text-slate-500">Where the pieces are right now, for every running production order</p>
            </div>
          </div>
          <div className="mr-4 hidden md:block">
            <SewingMachineArt />
          </div>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard theme="blue" icon={Layers} label="Running Orders" value={n(rows.length)} sub="Released, in progress or paused" />
        <StatCard theme="green" icon={CircleCheck} label="In Progress" value={n(count("IN_PROGRESS"))} sub="Currently running" />
        <StatCard theme="violet" icon={Pause} label="Paused" value={n(count("PAUSED"))} sub="Temporarily stopped" />
        <StatCard theme="orange" icon={Clock} label="Released" value={n(count("RELEASED"))} sub="Not started yet" />
      </div>

      <WipTable rows={rows} />
    </div>
  );
}