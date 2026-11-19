import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { orderService } from "@/services/order.service";
import { PageBand } from "@/components/approvals/ui";
import { OrdersTable, type OrderRow } from "./orders-table";

const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export default async function OrdersPage() {
  const orders = await orderService.list();

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    buyerPoNo: o.buyerPoNo ?? "",
    buyer: o.buyer.name,
    shipDate: o.shipDate ? o.shipDate.toISOString().slice(0, 10) : "",
    units: o.lines.reduce((s, l) => s + l.quantity, 0),
    value: `${o.currency} ${money(o.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0))}`,
    status: o.status,
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
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Orders</h1>
              <p className="text-sm text-navy-800">Buyer orders and their color / size breakdown</p>
            </div>
          </div>
          <Link
            href="/orders/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Order
          </Link>
        </header>
      </PageBand>

      <OrdersTable rows={rows} />
    </div>
  );
}