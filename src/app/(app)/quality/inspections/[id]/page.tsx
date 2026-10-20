import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { qualityService } from "@/services/quality.service";

const TABS: DetailTab[] = [{ key: "defects", label: "Defects" }];

export default async function InspectionDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const insp = await qualityService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!insp) notFound();

  const defects = insp.occurrences.reduce((s, o) => s + o.quantity, 0);
  const dhu = insp.sampleSize > 0 ? `${((defects / insp.sampleSize) * 100).toFixed(1)}%` : "-";

  return (
    <DetailPage
      code={insp.stage.toLowerCase()}
      title={insp.inspectionNo}
      basePath={`/quality/inspections/${id}`}
      tabs={TABS}
      activeTab="defects"
      kpis={[
        { label: "Pieces checked", value: insp.sampleSize },
        { label: "Defective pieces", value: insp.defectiveQty },
        { label: "Defects", value: defects },
        { label: "DHU", value: dhu },
      ]}
      side={
        <>
          <SidePanelSection title="Details">
            <p className="text-muted-foreground">Stage: {insp.stage.toLowerCase()}</p>
            <p className="text-muted-foreground">Operation: {insp.operation ?? "-"}</p>
            <p className="text-muted-foreground">When: {insp.inspectedAt.toISOString().slice(0, 16).replace("T", " ")}</p>
          </SidePanelSection>
          {insp.productionOrderId && (
            <SidePanelSection title="Related records">
              <Link href={`/production-orders/${insp.productionOrderId}`} className="block text-denim-700 hover:underline">
                View production order
              </Link>
            </SidePanelSection>
          )}
          {insp.remarks && (
            <SidePanelSection title="Remarks">
              <p className="text-muted-foreground">{insp.remarks}</p>
            </SidePanelSection>
          )}
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Defects found</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Defect</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Root cause</TableHead>
                <TableHead>Corrective action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insp.occurrences.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No defects recorded
                  </TableCell>
                </TableRow>
              ) : (
                insp.occurrences.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="font-medium">{o.defect.name}</p>
                      <p className="text-xs text-muted-foreground">{o.defect.code}</p>
                    </TableCell>
                    <TableCell className="capitalize">{o.severity.toLowerCase()}</TableCell>
                    <TableCell className="text-right">{o.quantity}</TableCell>
                    <TableCell>{o.rootCause ?? "-"}</TableCell>
                    <TableCell>{o.correctiveAction ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}