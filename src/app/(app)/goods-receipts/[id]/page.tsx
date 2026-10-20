import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { grnService } from "@/services/grn.service";
import { GrnActions } from "./grn-actions";

const TABS: DetailTab[] = [{ key: "lines", label: "Lines" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  DRAFT: "Check the quantities, then post to stock.",
  POSTED: "Posted. The goods are in stock. To correct a mistake, use a stock adjustment.",
  CANCELLED: "This GRN was cancelled. Nothing went into stock.",
};

export default async function GrnDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const grn = await grnService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!grn) notFound();

  const totalQty = grn.lines.reduce((s, l) => s + Number(l.receivedQty), 0);

  return (
    <DetailPage
      code={grn.po.supplier.name}
      title={grn.grnNo}
      status={grn.status}
      basePath={`/goods-receipts/${id}`}
      tabs={TABS}
      activeTab="lines"
      actions={<GrnActions grnId={id} status={grn.status} />}
      kpis={[
        { label: "Lines", value: grn.lines.length },
        { label: "Total qty", value: fmt(totalQty) },
        { label: "Received", value: day(grn.receivedDate) },
        { label: "Warehouse", value: grn.warehouse.code },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/purchase-orders/${grn.poId}`} className="block text-denim-700 hover:underline">
              PO {grn.po.poNo}
            </Link>
            <p className="text-muted-foreground">Challan: {grn.challanNo ?? "-"}</p>
          </SidePanelSection>
          {grn.remarks && (
            <SidePanelSection title="Remarks">
              <p className="text-muted-foreground">{grn.remarks}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[grn.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Received material</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Color / shade</TableHead>
                <TableHead>Rolls</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.material.name}</p>
                    <p className="text-xs text-muted-foreground">{l.material.code}</p>
                  </TableCell>
                  <TableCell>
                    {fmt(Number(l.receivedQty))} {l.unit}
                  </TableCell>
                  <TableCell>{l.lotNo ?? "-"}</TableCell>
                  <TableCell>{[l.color, l.shade].filter(Boolean).join(" / ") || "-"}</TableCell>
                  <TableCell>{l.rolls.length > 0 ? l.rolls.length : "-"}</TableCell>
                  <TableCell>{l.overReason ?? l.remarks ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}