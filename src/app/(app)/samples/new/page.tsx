import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { SampleForm } from "./sample-form";

export default async function NewSamplePage(props: { searchParams: Promise<{ styleId?: string }> }) {
  const { styleId } = await props.searchParams;
  const [styles, orders] = await Promise.all([
    styleService.list().catch(() => []),
    orderService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New sample request" description="Ask the sample room to make a sample for a style." />
      <SampleForm
        defaultStyleId={styleId ?? ""}
        styles={styles
          .filter((s) => s.status !== "ARCHIVED")
          .map((s) => ({ id: s.id, buyerId: s.buyerId, label: `${s.styleNo} - ${s.name}` }))}
        orders={orders
          .filter((o) => o.status !== "CANCELLED" && o.status !== "CLOSED")
          .map((o) => ({ id: o.id, buyerId: o.buyerId, label: `${o.orderNo}${o.buyerPoNo ? ` (PO ${o.buyerPoNo})` : ""}` }))}
      />
    </div>
  );
}