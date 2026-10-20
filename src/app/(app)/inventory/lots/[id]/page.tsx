import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { resolveScope } from "@/lib/scope";

const num = (v: unknown) => (v === null || v === undefined ? "-" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(Number(v)));

export default async function LotDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requirePermission("inventory.view");
  const scope = await resolveScope(user.id);

  const lot = await prisma.inventoryLot.findUnique({
    where: { id },
    include: {
      material: { select: { code: true, name: true, unit: true } },
      // শুধু যে factory-র স্টক দেখার অনুমতি আছে
      rolls: {
        where: { warehouse: { factoryId: { in: scope.factoryIds } } },
        include: { warehouse: { select: { code: true } } },
        orderBy: { rollNo: "asc" },
      },
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!lot || lot.companyId !== user.companyId) notFound();

  const totalQty = lot.rolls.reduce((s, r) => s + Number(r.quantity), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Lot ${lot.lotNo}`}
        description={`${lot.material.code} · ${lot.material.name}${lot.color ? ` · ${lot.color}` : ""}${lot.shade ? ` / ${lot.shade}` : ""}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Rolls ({lot.rolls.length}) · received {num(totalQty)} {lot.material.unit}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Roll</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Inspection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lot.rolls.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      No rolls in this lot
                    </TableCell>
                  </TableRow>
                ) : (
                  lot.rolls.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/fabric-rolls/${r.id}`} className="font-medium text-denim-700 hover:underline">
                          {r.rollNo}
                        </Link>
                      </TableCell>
                      <TableCell>{r.warehouse.code}</TableCell>
                      <TableCell className="text-right">{num(r.quantity)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.inspectionStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lot.transactions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      No movements
                    </TableCell>
                  </TableRow>
                ) : (
                  lot.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.createdAt.toISOString().slice(0, 10)}</TableCell>
                      <TableCell className="capitalize">{t.type.toLowerCase().replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">
                        {num(t.quantity)} {t.unit}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}