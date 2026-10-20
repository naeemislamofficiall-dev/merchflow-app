import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/detail/status-badge";
import { fabricInspectionService } from "@/services/fabric-inspection.service";
import { inventoryService } from "@/services/inventory.service";
import { InspectionForm } from "./inspection-form";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const when = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

export default async function FabricRollsPage(props: { searchParams: Promise<{ rollNo?: string }> }) {
  const { rollNo } = await props.searchParams;
  const query = rollNo?.trim() ?? "";
  const result = query ? await inventoryService.scanRoll(query).catch(() => null) : null;
  const inspections = result
    ? await fabricInspectionService.listForRoll(result.roll.rollNo).catch(() => [])
    : [];

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="Fabric rolls" description="Scan or type a roll number to see its full history" />

      <form method="get" className="flex max-w-md gap-2">
        <Input name="rollNo" defaultValue={query} placeholder="Roll no" />
        <Button type="submit">Find</Button>
      </form>

      {query && !result && <p className="text-sm text-destructive">No roll found with number {query}.</p>}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {result.roll.rollNo}
                <StatusBadge status={result.roll.inspectionStatus} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Material</p>
                <p className="font-medium">{result.roll.material.name}</p>
                <p className="text-xs text-muted-foreground">{result.roll.material.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lot / shade</p>
                <p className="font-medium">
                  {result.roll.lot.lotNo} / {result.roll.shade ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {result.roll.warehouse.code}
                  {result.roll.bin ? ` / ${result.roll.bin.code}` : ""}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">GRN</p>
                <p className="font-medium">{result.roll.grnLine?.grn.grnNo ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">On hand</p>
                <p className="font-medium">{fmt(result.onHand)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Issued</p>
                <p className="font-medium">{fmt(result.issued)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reserved</p>
                <p className="font-medium">{fmt(result.reserved)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-medium">{fmt(result.available)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Shade</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                        Not inspected yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspections.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{when(i.inspectedAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={i.result} />
                        </TableCell>
                        <TableCell>{i.method ?? "-"}</TableCell>
                        <TableCell className="text-right">{i.defectPoints}</TableCell>
                        <TableCell>{i.shade ?? "-"}</TableCell>
                        <TableCell>{i.remarks ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <InspectionForm rollNo={result.roll.rollNo} />

          <Card>
            <CardHeader>
              <CardTitle>Stock history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.history.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{when(t.createdAt)}</TableCell>
                      <TableCell>{t.type.replace(/_/g, " ").toLowerCase()}</TableCell>
                      <TableCell className="text-right">{fmt(Number(t.quantity))}</TableCell>
                      <TableCell>{t.remarks ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}