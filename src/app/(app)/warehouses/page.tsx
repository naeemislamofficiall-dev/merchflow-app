import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { warehouseService } from "@/services/warehouse.service";
import { BinForm, WarehouseForm } from "./warehouse-forms";

export default async function WarehousesPage() {
  const [warehouses, factories] = await Promise.all([
    warehouseService.listAll(),
    warehouseService.listFactories(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Warehouses" description="Stores and bins where material is kept" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No warehouses yet
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.code}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.factory.code}</TableCell>
                    <TableCell className="capitalize">{w.type.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell>{w.bins.length === 0 ? "-" : w.bins.map((b) => b.code).join(", ")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WarehouseForm factories={factories.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` }))} />
      <BinForm warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} - ${w.name}` }))} />
    </div>
  );
}