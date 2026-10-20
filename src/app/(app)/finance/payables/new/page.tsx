import { PageHeader } from "@/components/layout/page-header";
import { poService } from "@/services/po.service";
import { supplierService } from "@/services/supplier.service";
import { PayableForm } from "./payable-form";

export default async function NewPayablePage() {
  const [suppliers, pos] = await Promise.all([
    supplierService.list({ activeOnly: true }).catch(() => []),
    poService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New supplier invoice" description="Subtotal is before tax. The total is worked out for you" />
      <PayableForm
        suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
        pos={pos.map((p) => ({ id: p.id, supplierId: p.supplierId, label: p.poNo }))}
      />
    </div>
  );
}