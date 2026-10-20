import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { MaterialsTable, type MaterialRow } from "./materials-table";

export default async function MaterialsPage() {
  const materials = await materialService.list();

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
    <div className="space-y-4">
      <PageHeader
        title="Materials"
        description="Fabric, trims and other materials used in BOM and purchasing"
        actions={
          <>
            <Link href="/materials/categories" className={buttonVariants({ variant: "outline" })}>
              Categories
            </Link>
            <Link href="/materials/new" className={buttonVariants()}>
              New material
            </Link>
          </>
        }
      />
      <MaterialsTable rows={rows} />
    </div>
  );
}