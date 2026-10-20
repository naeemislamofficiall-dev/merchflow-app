import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { mrpService } from "@/services/mrp.service";
import { CreatePrButton } from "./create-pr-button";

const TABS: DetailTab[] = [{ key: "lines", label: "Requirements" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

export default async function MrpDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const run = await mrpService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });

  const shortLines = run.lines.filter((l) => Number(l.netQty) > 0);
  const unlinked = run.lines.filter((l) => !l.bomItem.materialId);
  const hasPr = run.purchaseRequisitions.length > 0;

  return (
    <DetailPage
      code={`${run.bom.style.styleNo} · BOM v${run.bom.version}`}
      title={`MRP - ${run.runDate.toISOString().slice(0, 10)}`}
      basePath={`/material-requirements/${id}`}
      tabs={TABS}
      activeTab="lines"
      actions={shortLines.length > 0 && !hasPr ? <CreatePrButton runId={id} /> : undefined}
      kpis={[
        { label: "Quantity", value: fmt(run.orderQty) },
        { label: "Items", value: run.lines.length },
        {
          label: "Short items",
          value: shortLines.length,
          tone: shortLines.length > 0 ? "bad" : "good",
        },
        {
          label: "Not linked to material",
          value: unlinked.length,
          tone: unlinked.length > 0 ? "warn" : "default",
        },
      ]}
      side={
        <>
          <SidePanelSection title="Order">
            <p className="text-muted-foreground">{run.order?.orderNo ?? "Not linked to an order"}</p>
          </SidePanelSection>
          <SidePanelSection title="Purchase requisitions">
            {hasPr ? (
              run.purchaseRequisitions.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.prNo}</span>
                  <StatusBadge status={p.status} />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                {shortLines.length > 0 ? "No PR yet." : "No shortage. A PR is not needed."}
              </p>
            )}
          </SidePanelSection>
          <SidePanelSection title="Related records">
            <Link href={`/bom/${run.bomId}`} className="block text-denim-700 hover:underline">
              Open the BOM
            </Link>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Material requirements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Incoming</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Net to buy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.lines.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No lines
                  </TableCell>
                </TableRow>
              ) : (
                run.lines.map((l) => {
                  const net = Number(l.netQty);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">{l.bomItem.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.bomItem.material ? l.bomItem.material.code : "No material linked (stock counted as 0)"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {fmt(Number(l.grossQty))} {l.bomItem.unit}
                      </TableCell>
                      <TableCell>{fmt(Number(l.stockQty))}</TableCell>
                      <TableCell>{fmt(Number(l.incomingQty))}</TableCell>
                      <TableCell>{fmt(Number(l.reservedQty))}</TableCell>
                      <TableCell className={net > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                        {fmt(net)} {l.bomItem.unit}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}