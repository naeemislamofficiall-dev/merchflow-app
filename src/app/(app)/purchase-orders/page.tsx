import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { poTotals } from "@/lib/calculations";
import { poService } from "@/services/po.service";
import { PosTable, type PoRow } from "./pos-table";

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default async function PurchaseOrdersPage() {
  const pos = await poService.list();

  const rows: PoRow[] = pos.map((p) => ({
    id: p.id,
    poNo: p.poNo,
    supplier: p.supplier.name,
    currency: p.currency,
    total: money(
      poTotals(
        p.lines.map((l) => ({ quantity: Number(l.quantity), rate: Number(l.rate), taxPct: Number(l.taxPct) }))
      ).grandTotal
    ),
    lines: p.lines.length,
    deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString().slice(0, 10) : "",
    createdAt: p.createdAt.toISOString().slice(0, 10),
    status: p.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase orders"
        description="Orders placed with suppliers, created from approved purchase requisitions"
        actions={
          <Link href="/purchase-orders/new" className={buttonVariants()}>
            New PO
          </Link>
        }
      />
      <PosTable rows={rows} />
    </div>
  );
}
