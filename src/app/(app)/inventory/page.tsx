import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { inventoryService } from "@/services/inventory.service";
import { warehouseService } from "@/services/warehouse.service";
import { StockTable, type StockRow } from "./stock-table";

export default async function InventoryPage() {
  const user = await requireUser();
  const [stock, warehouses] = await Promise.all([inventoryService.stock(), warehouseService.listAll()]);
  const wh = new Map(warehouses.map((w) => [w.id, w]));
  const canAdjust = can(user, "inventory.adjust");

  const rows: StockRow[] = [...stock]
    .sort((a, b) => (a.materialCode ?? "").localeCompare(b.materialCode ?? ""))
    .map((r) => ({
      id: `${r.materialId}-${r.warehouseId}`,
      materialName: r.materialName ?? "-",
      materialCode: r.materialCode ?? "",
      warehouseId: r.warehouseId,
      warehouse: wh.get(r.warehouseId)?.name ?? "-",
      warehouseCode: wh.get(r.warehouseId)?.code ?? "",
      onHand: r.onHand,
      unit: r.unit ?? "",
    }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Box className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Stock</h1>
              <p className="text-sm text-navy-800">On-hand quantity by material and warehouse</p>
            </div>
          </div>
          {canAdjust && (
            <Link
              href="/inventory/adjustments"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Adjust Stock
            </Link>
          )}
        </header>
      </PageBand>

      <StockTable rows={rows} />
    </div>
  );
}