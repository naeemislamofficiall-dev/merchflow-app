import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { sampleTransitions } from "@/lib/status-rules";
import type { SampleStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { sampleService } from "@/services/sample.service";
import { SampleActions } from "./sample-actions";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "approvals", label: "Buyer decisions" },
];

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");
const typeLabel = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

const NEXT_HINT: Record<string, string> = {
  REQUESTED: "Start development when the sample room takes it.",
  IN_DEVELOPMENT: "Move to internal QC once the sample is made.",
  INTERNAL_QC: "Send to the buyer, or send back to development if QC fails.",
  SENT: "Mark it in buyer review when the buyer receives it.",
  BUYER_REVIEW: "Record the buyer's decision.",
  REJECTED: "Start a revision to fix the issues.",
  REVISION: "Send the revised sample to the buyer again.",
};

export default async function SampleDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const sample = await sampleService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!sample) notFound();

  const next = sampleTransitions[sample.status] as SampleStatus[];

  return (
    <DetailPage
      code={sample.sampleNo}
      title={`${sample.style.styleNo} - ${sample.style.name}`}
      status={sample.status}
      basePath={`/samples/${id}`}
      tabs={TABS}
      activeTab={tab}
      actions={<SampleActions sampleId={id} status={sample.status} next={next} />}
      kpis={[
        { label: "Type", value: typeLabel(sample.sampleType) },
        { label: "Quantity", value: sample.quantity },
        { label: "Due date", value: day(sample.dueDate) },
        {
          label: "Revisions",
          value: sample.revisionCount,
          tone: sample.revisionCount > 0 ? "warn" : "default",
        },
        { label: "Cost", value: sample.cost ? Number(sample.cost).toFixed(2) : "-" },
      ]}
      side={
        <>
          <SidePanelSection title="Style">
            <Link href={`/styles/${sample.styleId}`} className="text-denim-700 hover:underline">
              {sample.style.styleNo}
            </Link>
            <p className="text-muted-foreground">{sample.style.name}</p>
          </SidePanelSection>
          <SidePanelSection title="Shipment">
            {sample.sentDate ? (
              <>
                <p>{sample.courier || "Courier not recorded"}</p>
                <p className="text-muted-foreground">{sample.trackingNo || "No tracking no"}</p>
                <p className="text-muted-foreground">Sent {day(sample.sentDate)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Not sent yet.</p>
            )}
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT_HINT[sample.status] ?? "No action needed."}</p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Sample details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Requested" value={day(sample.requestedDate)} />
            <Row label="Due date" value={day(sample.dueDate)} />
            <Row label="Planned completion" value={day(sample.plannedCompletion)} />
            <Row label="Actual completion" value={day(sample.actualCompletion)} />
            <Row label="Sent date" value={day(sample.sentDate)} />
            <Row label="Assigned to" value={sample.assignedTo?.name} />
            <Row label="Material requirement" value={sample.materialRequirement} />
            <Row label="Comments" value={sample.comments} />
            <Row label="Buyer response" value={sample.buyerResponse} />
            <Row label="Notes" value={sample.notes} />
          </CardContent>
        </Card>
      )}

      {tab === "approvals" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Round</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sample.approvals.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No buyer decision yet
                  </TableCell>
                </TableRow>
              ) : (
                sample.approvals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">#{a.round}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.decision} />
                    </TableCell>
                    <TableCell>{a.comments ?? "-"}</TableCell>
                    <TableCell>{day(a.decidedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </DetailPage>
  );
}