import { PageHeader } from "@/components/layout/page-header";
import { buyerService } from "@/services/buyer.service";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { ReceivableForm } from "./receivable-form";

export default async function NewReceivablePage() {
  const [buyers, orders, styles] = await Promise.all([
    buyerService.list(true).catch(() => []),
    orderService.list().catch(() => []),
    styleService.list().catch(() => []),
  ]);
  const styleLabel = new Map(styles.map((s) => [s.id, `${s.styleNo} - ${s.name}`]));

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title="New buyer invoice"
        description="Invoiced quantity of a style cannot be more than the order quantity"
      />
      <ReceivableForm
        buyers={buyers.map((b) => ({ id: b.id, label: b.name }))}
        orders={orders
          .filter((o) => o.status !== "CANCELLED")
          .map((o) => {
            const qty = new Map<string, number>();
            for (const l of o.lines) qty.set(l.styleId, (qty.get(l.styleId) ?? 0) + l.quantity);
            return {
              id: o.id,
              buyerId: o.buyerId,
              label: o.orderNo,
              styles: [...qty].map(([id, q]) => ({ id, label: `${styleLabel.get(id) ?? id} (order qty ${q})` })),
            };
          })}
      />
    </div>
  );
}