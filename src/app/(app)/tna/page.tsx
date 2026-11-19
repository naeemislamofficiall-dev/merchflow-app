import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { tnaService } from "@/services/tna.service";
import { TnaTable, type PlanRow } from "./tna-table";

export default async function TnaPage() {
  const plans = await tnaService.listPlans();

  const rows: PlanRow[] = plans.map((p) => {
    const total = p.tasks.length;
    const closed = p.tasks.filter((t) => t.status === "COMPLETED" || t.status === "WAIVED").length;
    const delayed = p.tasks.filter((t) => t.status === "DELAYED").length;
    const atRisk = p.tasks.some((t) => t.status === "AT_RISK");
    const status =
      delayed > 0 ? "DELAYED" : atRisk ? "AT_RISK" : total > 0 && closed === total ? "COMPLETED" : "ON_TRACK";
    return {
      id: p.id,
      style: p.style.styleNo,
      shipDate: p.shipDate.toISOString().slice(0, 10),
      closed,
      total,
      delayed,
      status,
    };
  });

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <CalendarDays className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Time &amp; Action</h1>
              <p className="text-sm text-navy-800">Milestone plans counted backwards from the ship date</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tna/templates"
              className="inline-flex h-12 items-center gap-2 rounded-lg border bg-card px-5 text-sm font-semibold text-navy-800 shadow-card transition-colors hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4 text-blue-600" /> Template
            </Link>
            <Link
              href="/tna/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Generate Plan
            </Link>
          </div>
        </header>
      </PageBand>

      <TnaTable rows={rows} />
    </div>
  );
}