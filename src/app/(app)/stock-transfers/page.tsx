import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { stockTransferService } from "@/services/stock-transfer.service";
import { createTransferAction } from "./actions";

export default async function StockTransfersPage() {
  const user = await requireUser();
  if (!can(user, "inventory.view")) redirect("/dashboard");

  const canTransfer = can(user, "inventory.transfer");
  const [rows, warehouses] = await Promise.all([
    stockTransferService.list(),
    canTransfer ? stockTransferService.formOptions() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock transfers"
        description="Move stock between warehouses or bins. All lines move together when you complete the transfer"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Transfer</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No transfers yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/stock-transfers/${r.id}`} className="text-primary hover:underline">
                        {r.transferNo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.from}</TableCell>
                    <TableCell>{r.to}</TableCell>
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
      {canTransfer && (
        <CreateForm
          title="New transfer"
          columns={3}
          submitLabel="Create transfer"
          redirectBase="/stock-transfers"
          action={createTransferAction}
          fields={[
            { name: "fromWarehouseId", label: "From warehouse", type: "select", required: true, options: warehouses },
            { name: "toWarehouseId", label: "To warehouse", type: "select", required: true, options: warehouses },
            { name: "remarks", label: "Remarks" },
          ]}
        />
      )}
    </div>
  );
}
