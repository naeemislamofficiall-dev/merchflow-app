import { PageHeader } from "@/components/layout/page-header";
import { buyerService } from "@/services/buyer.service";
import { styleService } from "@/services/style.service";
import { OrderForm } from "./order-form";

export default async function NewOrderPage() {
  const [buyers, styles] = await Promise.all([
    buyerService.list(true).catch(() => []),
    styleService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="New order"
        description="Create the order with its lines. You fill the color / size matrix on the next screen."
      />
      <OrderForm
        buyers={buyers.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}`, currency: b.currency }))}
        styles={styles
          .filter((s) => s.status !== "ARCHIVED")
          .map((s) => ({ id: s.id, buyerId: s.buyerId, label: `${s.styleNo} - ${s.name} (${s.status.toLowerCase()})` }))}
      />
    </div>
  );
}