import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { materialService } from "@/services/material.service";
import { prService } from "@/services/pr.service";
import { LineForm } from "./line-form";
import { PrActions } from "./pr-actions";
import { RemoveLineButton } from "./remove-line-button";

const TABS: DetailTab[] = [{ key: "lines", label: "Lines" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const label = (v: string) => v.replace(/_/g, " ").toLowerCase();

const NEXT: Record<string, string> = {
  DRAFT: "Add the lines you need, then submit for approval.",
  SUBMITTED: "Waiting for approval.",
  APPROVED: "Create a purchase order or send an RFQ to suppliers.",
  PO_CREATED: "A purchase order exists. Close the PR when everything is received.",
  CLOSED: "This PR is closed.",
  REJECTED: "Move it back to draft to fix it and submit again.",
  CANCELLED: "This PR was cancelled.",
};

export default async function PrDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const pr = await prService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!pr) notFound();

  const editable = pr.status === "DRAFT";
  const materials = editable ? await materialService.list({ activeOnly: true }).catch(() => []) : [];

  return (
    <DetailPage
      code={pr.source.replace(/_/g, " ")}
      title={pr.prNo}
      status={pr.status}
      priority={label(pr.priority)}
      basePath={`/prs/${id}`}
      tabs={TABS}
      activeTab="lines"
      actions={<PrActions prId={id} status={pr.status} lineCount={pr.lines.length} />}
      kpis={[
        { label: "Lines", value: pr.lines.length },
        { label: "Required by", value: pr.requiredDate ? pr.requiredDate.toISOString().slice(0, 10) : "-" },
        { label: "Created", value: pr.createdAt.toISOString().slice(0, 10) },
      ]}
      side={
        <>
          <SidePanelSection title="Reason">
            <p className="text-muted-foreground">{pr.reason || "-"}</p>
          </SidePanelSection>
          <SidePanelSection title="Related records">
            {pr.mrpRunId ? (
              <Link href={`/material-requirements/${pr.mrpRunId}`} className="block text-denim-700 hover:underline">
                MRP run that created this PR
              </Link>
            ) : (
              <p className="text-muted-foreground">Not created from an MRP run.</p>
            )}
            {pr.department && <p className="text-muted-foreground">Department: {pr.department.name}</p>}
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[pr.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Requested material</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Remarks</TableHead>
                  {editable && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.lines.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={editable ? 4 : 3} className="h-20 text-center text-muted-foreground">
                      No lines yet
                    </TableCell>
                  </TableRow>
                ) : (
                  pr.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">{l.material.name}</p>
                        <p className="text-xs text-muted-foreground">{l.material.code}</p>
                      </TableCell>
                      <TableCell>
                        {fmt(Number(l.quantity))} {l.unit}
                      </TableCell>
                      <TableCell>{l.remarks ?? "-"}</TableCell>
                      {editable && (
                        <TableCell>
                          <RemoveLineButton lineId={l.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editable && (
          <LineForm prId={id} materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name} (${m.unit})` }))} />
        )}
      </div>
    </DetailPage>
  );
}