import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
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
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description="Buyer orders and their color / size breakdown"
        actions={
          <Link href="/orders/new" className={buttonVariants()}>
            New order
          </Link>
        }
      />
      <OrdersTable rows={rows} />
    </div>
  );
}