import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { poTotals } from "@/lib/calculations";
import { poService } from "@/services/po.service";
import { PosTable, type PoRow } from "./pos-table";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <ShoppingCart className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Purchase Orders</h1>
              <p className="text-sm text-navy-800">
                Orders placed with suppliers, created from approved purchase requisitions
              </p>
            </div>
          </div>
          <Link
            href="/purchase-orders/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New PO
          </Link>
        </header>
      </PageBand>

      <PosTable rows={rows} />
    </div>
  );
}