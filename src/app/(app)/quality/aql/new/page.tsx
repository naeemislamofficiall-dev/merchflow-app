import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { productionOrderService } from "@/services/production-order.service";
import { AqlForm } from "./aql-form";

export default async function NewAqlPage() {
  const [orders, pos] = await Promise.all([
    orderService.list().catch(() => []),
    productionOrderService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New AQL inspection" description="The sample size and accept numbers are worked out for you" />
      <AqlForm
        orders={orders
          .filter((o) => o.status !== "CANCELLED")
          .map((o) => ({ id: o.id, label: `${o.orderNo} - ${o.buyer.name}` }))}
        productionOrders={pos.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          label: `${p.productionNo} (${p.style.styleNo})`,
        }))}
      />
    </div>
  );
}