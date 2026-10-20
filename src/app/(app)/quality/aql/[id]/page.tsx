import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { aqlService } from "@/services/aql.service";
import { AqlActions } from "./aql-actions";

const TABS: DetailTab[] = [{ key: "plan", label: "Plan and result" }];

export default async function AqlDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const a = await aqlService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!a) notFound();

  const recorded = a.foundMajor !== null;

  return (
    <DetailPage
      code={a.stage.toLowerCase()}
      title={a.inspectionNo}
      status={a.result}
      basePath={`/quality/aql/${id}`}
      tabs={TABS}
      activeTab="plan"
      actions={<AqlActions aqlId={id} result={a.result} recorded={recorded} />}
      kpis={[
        { label: "Lot size", value: a.lotSize },
        { label: "Sample size", value: a.sampleSize },
        { label: "Level", value: a.inspectionLevel },
        { label: "AQL major / minor", value: `${Number(a.aqlMajor)} / ${Number(a.aqlMinor)}` },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/orders/${a.orderId}`} className="block text-denim-700 hover:underline">
              View order
            </Link>
            {a.productionOrderId && (
              <Link href={`/production-orders/${a.productionOrderId}`} className="block text-denim-700 hover:underline">
                View production order
              </Link>
            )}
          </SidePanelSection>
          {a.overrideReason && (
            <SidePanelSection title="Override">
              <p className="text-muted-foreground">{a.overrideReason}</p>
            </SidePanelSection>
          )}
          {a.remarks && (
            <SidePanelSection title="Remarks">
              <p className="text-muted-foreground">{a.remarks}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {!recorded
                ? "Check the sample, then record what you found."
                : a.result === "PASS"
                  ? "Passed. The shipment is not blocked."
                  : "Not passed. The shipment stays blocked unless someone with permission overrides it."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Accept and reject numbers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Defect class</TableHead>
                <TableHead className="text-right">Accept up to</TableHead>
                <TableHead className="text-right">Reject at</TableHead>
                <TableHead className="text-right">Found</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Critical</TableCell>
                <TableCell className="text-right">0</TableCell>
                <TableCell className="text-right">1</TableCell>
                <TableCell className="text-right">{a.foundCritical ?? "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Major</TableCell>
                <TableCell className="text-right">{a.acceptMajor}</TableCell>
                <TableCell className="text-right">{a.rejectMajor}</TableCell>
                <TableCell className="text-right">{a.foundMajor ?? "-"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Minor</TableCell>
                <TableCell className="text-right">{a.acceptMinor}</TableCell>
                <TableCell className="text-right">{a.rejectMinor}</TableCell>
                <TableCell className="text-right">{a.foundMinor ?? "-"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}