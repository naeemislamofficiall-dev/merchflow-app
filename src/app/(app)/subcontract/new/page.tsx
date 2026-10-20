import { PageHeader } from "@/components/layout/page-header";
import { productionOrderService } from "@/services/production-order.service";
import { supplierService } from "@/services/supplier.service";
import { SubcontractForm } from "./subcontract-form";

export default async function NewSubcontractPage() {
  const [pos, vendors] = await Promise.all([
    productionOrderService.list().catch(() => []),
    supplierService.list({ activeOnly: true }).catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Send goods outside"
        description="The process must be a step of the production order route. Sent pieces cannot be more than the order allows"
      />
      <SubcontractForm
        productionOrders={pos
          .filter((p) => p.status === "RELEASED" || p.status === "IN_PROGRESS")
          .map((p) => ({ id: p.id, label: `${p.productionNo} (${p.style.styleNo}, ${p.quantity} pcs)` }))}
        vendors={vendors.map((v) => ({ id: v.id, label: `${v.code} - ${v.name}` }))}
      />
    </div>
  );
}