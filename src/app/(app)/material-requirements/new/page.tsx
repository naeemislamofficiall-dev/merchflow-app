import { PageHeader } from "@/components/layout/page-header";
import { bomService } from "@/services/bom.service";
import { orderService } from "@/services/order.service";
import { MrpForm } from "./mrp-form";

export default async function NewMrpPage() {
  const [boms, orders] = await Promise.all([
    bomService.list(),
    // order.view না থাকলে order বাছা ছাড়াই চলবে
    orderService.list().catch(() => []),
  ]);

  const approved = boms.filter((b) => b.status === "APPROVED");

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Run MRP" description="Work out the material needed for a quantity of garments" />
      <MrpForm
        boms={approved.map((b) => ({ id: b.id, label: `${b.style.styleNo} - ${b.style.name} (v${b.version})` }))}
        orders={orders.map((o) => ({
          id: o.id,
          label: `${o.orderNo}${o.buyerPoNo ? ` / PO ${o.buyerPoNo}` : ""}`,
          units: o.lines.reduce((sum, l) => sum + l.quantity, 0),
        }))}
      />
    </div>
  );
}