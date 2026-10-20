import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryService } from "@/services/inventory.service";
import { warehouseService } from "@/services/warehouse.service";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

export default async function InventoryPage() {
  const [stock, warehouses] = await Promise.all([inventoryService.stock(), warehouseService.listAll()]);
  const whCode = new Map(warehouses.map((w) => [w.id, w.code]));

  const rows = [...stock].sort((a, b) => (a.materialCode ?? "").localeCompare(b.materialCode ?? ""));

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" description="On-hand quantity by material and warehouse" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    No stock yet. Post a goods receipt to add stock.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={`${r.materialId}-${r.warehouseId}`}>
                    <TableCell>
                      <p className="font-medium">{r.materialName}</p>
                      <p className="text-xs text-muted-foreground">{r.materialCode}</p>
                    </TableCell>
                    <TableCell>{whCode.get(r.warehouseId) ?? "-"}</TableCell>
                    <TableCell className={`text-right ${r.onHand < 0 ? "text-destructive" : ""}`}>
                      {fmt(r.onHand)} {r.unit}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}