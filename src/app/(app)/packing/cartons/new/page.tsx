import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { productionOrderService } from "@/services/production-order.service";
import { styleService } from "@/services/style.service";
import { CartonForm } from "./carton-form";

const PO_OK = ["IN_PROGRESS", "PAUSED", "COMPLETED"];

export default async function NewCartonPage() {
  const [orders, pos] = await Promise.all([
    orderService.list().catch(() => []),
    productionOrderService.list().catch(() => []),
  ]);

  const okOrders = orders.filter((o) => o.status === "IN_PRODUCTION" || o.status === "PARTIALLY_SHIPPED");
  const okPos = pos.filter((p) => PO_OK.includes(p.status) && okOrders.some((o) => o.id === p.orderId));

  const styleIds = [...new Set(okPos.map((p) => p.styleId))];
  const styles = (await Promise.all(styleIds.map((id) => styleService.get(id).catch(() => null)))).filter(
    (s): s is NonNullable<typeof s> => !!s
  );
  const styleById = new Map(styles.map((s) => [s.id, s]));

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title="New carton"
        description="Packed pieces cannot be more than the pieces finished in finishing"
      />
      <CartonForm
        orders={okOrders.map((o) => ({ id: o.id, label: `${o.orderNo} - ${o.buyer.name}` }))}
        productionOrders={okPos.map((p) => {
          const st = styleById.get(p.styleId);
          return {
            id: p.id,
            orderId: p.orderId,
            label: `${p.productionNo} (${p.style.styleNo})`,
            colors: (st?.colors ?? []).map((c) => ({ id: c.id, label: c.name })),
            sizes: (st?.sizes ?? []).map((s) => ({ id: s.id, label: s.label })),
          };
        })}
      />
    </div>
  );
}