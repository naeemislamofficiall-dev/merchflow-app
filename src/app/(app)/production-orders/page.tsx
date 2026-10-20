import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { productionOrderService } from "@/services/production-order.service";
import { ProductionTable, type ProductionRow } from "./production-table";

const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function ProductionOrdersPage() {
  const list = await productionOrderService.list();

  const rows: ProductionRow[] = list.map((p) => ({
    id: p.id,
    productionNo: p.productionNo,
    order: p.order.orderNo,
    style: p.style.styleNo,
    factory: p.factory.code,
    line: p.line?.code ?? "",
    quantity: p.quantity,
    completedQty: p.completedQty,
    startDate: day(p.startDate),
    endDate: day(p.endDate),
    priority: p.priority,
    status: p.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Production orders"
        description="Plans to produce a style of a confirmed order in a factory"
        actions={
          <div className="flex gap-2">
            <Link href="/production-orders/routes" className={buttonVariants({ variant: "outline" })}>
              Routes
            </Link>
            <Link href="/production-orders/new" className={buttonVariants()}>
              New production order
            </Link>
          </div>
        }
      />
      <ProductionTable rows={rows} />
    </div>
  );
}