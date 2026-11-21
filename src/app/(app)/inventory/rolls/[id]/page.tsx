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

export default async function RollDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requirePermission("inventory.view");

  const roll = await prisma.fabricRoll.findUnique({
    where: { id },
    include: {
      material: { select: { code: true, name: true, unit: true } },
      lot: { select: { id: true, lotNo: true } },
      warehouse: { select: { code: true, name: true, factoryId: true } },
      bin: { select: { code: true } },
      inspections: { orderBy: { inspectedAt: "desc" }, take: 10 },
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!roll || roll.companyId !== user.companyId) notFound();
  const scope = await resolveScope(user.id);
  if (!scope.factoryIds.includes(roll.warehouse.factoryId)) notFound();

  const rows: [string, string][] = [
    ["Material", `${roll.material.code} · ${roll.material.name}`],
    ["Color / shade", [roll.color, roll.shade].filter(Boolean).join(" / ") || "-"],
    ["GSM", num(roll.gsm)],
    ["Width (cm)", num(roll.widthCm)],
    ["Length", num(roll.length)],
    ["Weight (kg)", num(roll.weightKg)],
    ["Received qty", `${num(roll.quantity)} ${roll.material.unit}`],
    ["Warehouse", `${roll.warehouse.code} · ${roll.warehouse.name}`],
    ["Bin", roll.bin?.code ?? "-"],
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Roll ${roll.rollNo}`}
        description="Fabric roll details, inspection history and stock movements"
        actions={<StatusBadge status={roll.inspectionStatus} />}
      />

      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Lot</p>
            <Link href={`/inventory/lots/${roll.lot.id}`} className="text-sm font-medium text-denim-700 hover:underline">
              {roll.lot.lotNo}
            </Link>
          </div>
          {rows.map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inspections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roll.inspections.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      Not inspected yet
                    </TableCell>
                  </TableRow>
                ) : (
                  roll.inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.inspectedAt.toISOString().slice(0, 10)}</TableCell>
                      <TableCell>
                        <StatusBadge status={i.result} />
                      </TableCell>
                      <TableCell>{i.remarks ?? "-"}</TableCell>
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
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roll.transactions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      No movements
                    </TableCell>
                  </TableRow>
                ) : (
                  roll.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.createdAt.toISOString().slice(0, 10)}</TableCell>
                      <TableCell className="capitalize">{t.type.toLowerCase().replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">
                        {num(t.quantity)} {t.unit}
                      </TableCell>
                      <TableCell>{t.remarks ?? "-"}</TableCell>
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