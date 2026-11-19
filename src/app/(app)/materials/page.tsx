import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { materialService } from "@/services/material.service";
import { MaterialsTable, type MaterialRow } from "./materials-table";

export default async function MaterialsPage() {
  const user = await requireUser();
  const materials = await materialService.list();
  const canEdit = can(user, "material.edit");

  const rows: MaterialRow[] = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category.name,
    unit: m.unit,
    reorderPoint: m.reorderPoint ? String(m.reorderPoint) : "",
    status: m.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Box className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Materials</h1>
              <p className="text-sm text-navy-800">Fabric, trims and other materials used in BOM and purchasing</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/materials/categories"
              className="inline-flex h-12 items-center rounded-lg border bg-card px-5 text-sm font-semibold text-navy-800 shadow-card transition-colors hover:bg-slate-50"
            >
              Categories
            </Link>
            <Link
              href="/materials/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New Material
            </Link>
          </div>
        </header>
      </PageBand>

      <MaterialsTable rows={rows} canEdit={canEdit} />
    </div>
  );
}