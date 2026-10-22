import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { stockCountService } from "@/services/stock-count.service";
import { warehouseService } from "@/services/warehouse.service";
import { CountCreateForm } from "./count-create-form";

export default async function StockCountsPage() {
  const user = await requireUser();
  if (!can(user, "stockcount.view")) redirect("/dashboard");

  const [rows, warehouses] = await Promise.all([
    stockCountService.list(),
    can(user, "stockcount.create") ? warehouseService.listAll().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock counts"
        description="Count what is physically in a warehouse. Posting the count fixes the book stock with audited adjustments"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Count</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No stock counts yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/stock-counts/${r.id}`} className="text-primary hover:underline">
                        {r.countNo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.warehouseName}</TableCell>
                    <TableCell>{r.createdAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-right">{r.lineCount}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {can(user, "stockcount.create") && (
        <CountCreateForm warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} - ${w.name}` }))} />
      )}
    </div>
  );
}
