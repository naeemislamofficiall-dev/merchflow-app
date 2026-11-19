import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
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
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Settings className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Production orders</h1>
              <p className="text-sm text-slate-500">Plans to produce a style of a confirmed order in a factory</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/production-orders/routes"
              className="inline-flex h-12 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 shadow-xs transition-transform hover:-translate-y-0.5"
            >
              Routes
            </Link>
            <Link
              href="/production-orders/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New production order
            </Link>
          </div>
        </header>
      </PageBand>

      <ProductionTable rows={rows} />
    </div>
  );
}