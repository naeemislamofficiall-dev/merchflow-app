import Link from "next/link";
import { CircleAlert, ClipboardList, Plus, ShieldCheck } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { capaService } from "@/services/capa.service";
import { CapaTable, type CapaRow } from "./capa-table";

const n = (v: number) => v.toLocaleString("en-US");

export default async function CapaPage() {
  const [list, pending] = await Promise.all([capaService.list(), capaService.pending()]);
  const now = new Date();

  const rows: CapaRow[] = list.map((c) => ({
    id: c.id,
    capaNo: c.capaNo,
    title: c.title,
    category: c.category ?? "",
    dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : "",
    overdue: !!c.dueDate && c.dueDate < now && c.status !== "CLOSED" && c.status !== "CANCELLED",
    status: c.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <ShieldCheck className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">CAPA</h1>
              <p className="text-sm text-slate-500">
                Find the root cause of a quality problem, fix it, and prove the fix worked
              </p>
            </div>
          </div>
          <Link
            href="/quality/capa/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New CAPA
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <StatCard theme="blue" icon={ClipboardList} label="Open" value={n(pending.open)} sub="CAPAs not closed yet" />
        <StatCard
          theme={pending.overdue > 0 ? "red" : "green"}
          icon={CircleAlert}
          label="Overdue"
          value={n(pending.overdue)}
          sub="Past the due date"
        />
      </div>

      <CapaTable rows={rows} />
    </div>
  );
}