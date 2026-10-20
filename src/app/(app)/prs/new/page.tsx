import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { PrForm } from "./pr-form";

export default async function NewPrPage() {
  const materials = await materialService.list({ activeOnly: true }).catch(() => []);
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New purchase requisition" description="Request material to be bought" />
      <PrForm materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name} (${m.unit})` }))} />
    </div>
  );
}