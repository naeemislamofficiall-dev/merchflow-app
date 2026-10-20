import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { rfqService } from "@/services/rfq.service";
import { supplierService } from "@/services/supplier.service";
import { QuotationForm } from "./quotation-form";

export default async function NewQuotationPage() {
  const [suppliers, materials, rfqs] = await Promise.all([
    supplierService.list({ activeOnly: true }).catch(() => []),
    materialService.list({ activeOnly: true }).catch(() => []),
    rfqService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Record quotation" description="Enter the price a supplier sent you" />
      <QuotationForm
        suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
        materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name}` }))}
        rfqs={rfqs.filter((r) => r.status === "SENT").map((r) => ({ id: r.id, label: r.rfqNo }))}
      />
    </div>
  );
}