import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { orderService } from "@/services/order.service";
import { warehouseService } from "@/services/warehouse.service";
import { IssueForm } from "./issue-form";

export default async function NewIssuePage() {
  const [warehouses, orders, materials] = await Promise.all([
    warehouseService.listAll().catch(() => []),
    orderService.list().catch(() => []),
    materialService.list({ activeOnly: true }).catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Issue material"
        description="Issue is limited to the approved BOM requirement. Going over needs an override permission and a reason"
      />
      <IssueForm
        warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} - ${w.name}` }))}
        orders={orders
          .filter((o) => o.status !== "CANCELLED" && o.status !== "CLOSED")
          .map((o) => ({ id: o.id, label: `${o.orderNo} - ${o.buyer.name}` }))}
        materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name} (${m.unit})` }))}
      />
    </div>
  );
}