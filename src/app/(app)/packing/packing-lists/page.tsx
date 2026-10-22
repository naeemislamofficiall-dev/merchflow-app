import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { packingListService } from "@/services/packing-list.service";
import { PackingListCreateForm } from "./create-form";

export default async function PackingListsPage() {
  const user = await requireUser();
  if (!can(user, "packing.view")) redirect("/dashboard");

  const [rows, shipments] = await Promise.all([
    packingListService.list(),
    can(user, "packing.create") ? packingListService.shipmentOptions().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Packing lists"
        description="A packing list is built from a shipment's cartons. Once issued it is frozen"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Packing list</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Cartons</TableHead>
                <TableHead className="text-right">Pcs</TableHead>
                <TableHead className="text-right">Gross kg</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No packing lists yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/packing/packing-lists/${r.id}`} className="text-primary hover:underline">
                        {r.packingListNo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.shipmentNo}</TableCell>
                    <TableCell>{r.buyerName}</TableCell>
                    <TableCell className="text-right">{r.totalCartons}</TableCell>
                    <TableCell className="text-right">{r.totalPcs.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.totalGrossKg.toLocaleString()}</TableCell>
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
      {can(user, "packing.create") && <PackingListCreateForm shipments={shipments} />}
    </div>
  );
}
