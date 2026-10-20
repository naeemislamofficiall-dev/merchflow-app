import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { materialIssueService } from "@/services/material-issue.service";

const TABS: DetailTab[] = [{ key: "lines", label: "Lines" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

export default async function IssueDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const issue = await materialIssueService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!issue) notFound();

  const totalQty = issue.lines.reduce((s, l) => s + Number(l.quantity), 0);

  return (
    <DetailPage
      code={issue.targetType.replace(/_/g, " ").toLowerCase()}
      title={issue.issueNo}
      basePath={`/material-issues/${id}`}
      tabs={TABS}
      activeTab="lines"
      kpis={[
        { label: "Lines", value: issue.lines.length },
        { label: "Total qty", value: fmt(totalQty) },
        { label: "Issued", value: issue.issuedAt.toISOString().slice(0, 10) },
        { label: "Warehouse", value: issue.warehouse.code },
      ]}
      side={
        <>
          {issue.orderId && (
            <SidePanelSection title="Related records">
              <Link href={`/orders/${issue.orderId}`} className="block text-denim-700 hover:underline">
                View order
              </Link>
            </SidePanelSection>
          )}
          {issue.overrideReason && (
            <SidePanelSection title="Override reason">
              <p className="text-muted-foreground">{issue.overrideReason}</p>
            </SidePanelSection>
          )}
          {issue.remarks && (
            <SidePanelSection title="Remarks">
              <p className="text-muted-foreground">{issue.remarks}</p>
            </SidePanelSection>
          )}
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Issued material</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Returned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issue.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.material.name}</p>
                    <p className="text-xs text-muted-foreground">{l.material.code}</p>
                  </TableCell>
                  <TableCell>
                    {fmt(Number(l.quantity))} {l.unit}
                  </TableCell>
                  <TableCell>{fmt(Number(l.returnedQty))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}