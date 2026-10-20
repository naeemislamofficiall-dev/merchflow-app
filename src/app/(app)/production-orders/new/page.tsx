import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { productionOrderService } from "@/services/production-order.service";
import { routingService } from "@/services/routing.service";
import { styleService } from "@/services/style.service";
import { ProductionForm } from "./production-form";

export default async function NewProductionOrderPage() {
  const [opts, orders, styles, routes] = await Promise.all([
    productionOrderService.formOptions(),
    orderService.list().catch(() => []),
    styleService.list().catch(() => []),
    routingService.list().catch(() => []),
  ]);

  const styleLabel = new Map(styles.map((s) => [s.id, `${s.styleNo} - ${s.name}`]));

  // শুধু Confirmed / In production অর্ডারে প্ল্যান করা যায়
  const orderOptions = orders
    .filter((o) => o.status === "CONFIRMED" || o.status === "IN_PRODUCTION")
    .map((o) => {
      const qtyByStyle = new Map<string, number>();
      for (const l of o.lines) qtyByStyle.set(l.styleId, (qtyByStyle.get(l.styleId) ?? 0) + l.quantity);
      return {
        id: o.id,
        label: `${o.orderNo} - ${o.buyer.name}`,
        styles: [...qtyByStyle].map(([id, qty]) => ({ id, label: styleLabel.get(id) ?? id, qty })),
      };
    });

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New production order" description="Only confirmed orders can be planned" />
      <ProductionForm
        factories={opts.factories.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` }))}
        lines={opts.lines.map((l) => ({ id: l.id, label: `${l.code} - ${l.name}`, factoryId: l.factoryId }))}
        orders={orderOptions}
        routes={routes.filter((r) => r.isActive).map((r) => ({
          id: r.id,
          label: `${r.code} (${r.steps.map((s) => s.process.toLowerCase()).join(" → ")})`,
        }))}
      />
    </div>
  );
}