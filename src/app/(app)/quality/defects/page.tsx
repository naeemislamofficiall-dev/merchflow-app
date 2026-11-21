import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { qualityService } from "@/services/quality.service";
import { DefectForm } from "./defect-form";
import { DefectsTable, type DefectRow } from "./defects-table";

export default async function DefectsPage() {
  const defects = await qualityService.listDefects(true);

  const rows: DefectRow[] = defects.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    category: d.category ?? "",
    severity: d.severity,
    isActive: d.isActive,
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
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Defects</h1>
              <p className="text-sm text-slate-500">The defect list inspectors choose from</p>
            </div>
          </div>
          <Link
            href="#add-defect"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Defect
          </Link>
        </header>
      </PageBand>

      <DefectsTable rows={rows} />

      <div id="add-defect" className="scroll-mt-6">
        <DefectForm />
      </div>
    </div>
  );
}