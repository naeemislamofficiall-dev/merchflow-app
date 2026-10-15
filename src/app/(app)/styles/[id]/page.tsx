import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { styleTransitions } from "@/lib/status-rules";
import type { StyleStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { styleService } from "@/services/style.service";
import { MatrixEditor } from "./matrix-editor";
import { StatusActions } from "./status-actions";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "matrix", label: "Color / size" },
  { key: "documents", label: "Documents" },
  { key: "revisions", label: "Revisions" },
];

const day = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

export default async function StyleDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const style = await styleService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!style) notFound();

  const matrix = await styleService.getMatrix(id);
  const next = styleTransitions[style.status] as StyleStatus[];
  const latestSample = style.sampleRequests[0];
  const pendingRevisions = style.revisions.filter((r) => r.reason && !r.approvedAt).length;

  return (
    <DetailPage
      code={style.styleNo}
      title={style.name}
      status={style.status}
      basePath={`/styles/${id}`}
      tabs={TABS}
      activeTab={tab}
      actions={<StatusActions styleId={id} next={next} />}
      kpis={[
        { label: "Colors", value: style.colors.length },
        { label: "Sizes", value: style.sizes.length },
        { label: "Planned qty", value: fmt(matrix.total) },
        { label: "Documents", value: style.techPacks.length },
        {
          label: "Pending revisions",
          value: pendingRevisions,
          tone: pendingRevisions > 0 ? "warn" : "default",
        },
      ]}
      side={
        <>
          <SidePanelSection title="Buyer">
            <p>{style.buyer.name}</p>
            <p className="text-muted-foreground">{style.buyer.code}</p>
          </SidePanelSection>
          <SidePanelSection title="Latest sample">
            {latestSample ? (
              <>
                <p>{latestSample.sampleNo}</p>
                <StatusBadge status={latestSample.status} />
              </>
            ) : (
              <p className="text-muted-foreground">No sample requested yet.</p>
            )}
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {style.colors.length === 0 || style.sizes.length === 0
                ? "Add colors and sizes in the Color / size tab."
                : style.status === "DRAFT"
                  ? "Move the style to development."
                  : style.status === "DEVELOPMENT"
                    ? "Approve the style when the tech pack is final."
                    : "No action needed."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Technical specification</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Season" value={style.season} />
            <Row label="Category" value={style.category} />
            <Row label="Garment type" value={style.garmentType} />
            <Row label="Gender" value={style.gender} />
            <Row label="Fabric type" value={style.fabricType} />
            <Row label="Composition" value={style.composition} />
            <Row label="GSM" value={style.gsm} />
            <Row label="Construction" value={style.construction} />
            <Row label="Wash type" value={style.washType} />
            <Row label="Print" value={style.print} />
            <Row label="Embroidery" value={style.embroidery} />
            <Row label="Description" value={style.description} />
          </CardContent>
        </Card>
      )}

      {tab === "matrix" && (
        <MatrixEditor
          styleId={id}
          colors={style.colors.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
          sizes={style.sizes.map((s) => ({ id: s.id, label: s.label }))}
          cells={matrix.cells}
          locked={style.status === "ARCHIVED"}
        />
      )}

      {tab === "documents" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {style.techPacks.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No documents yet
                  </TableCell>
                </TableRow>
              ) : (
                style.techPacks.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="capitalize">{d.docType.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>{d.version}</TableCell>
                    <TableCell>
                      {d.fileUrl ? (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-denim-700 hover:underline">
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{day(d.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === "revisions" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Rev</TableHead>
                <TableHead>Reason / note</TableHead>
                <TableHead>Changed fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {style.revisions.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No revisions yet
                  </TableCell>
                </TableRow>
              ) : (
                style.revisions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">#{r.revisionNo}</TableCell>
                    <TableCell>{r.reason ?? r.changeNote ?? "-"}</TableCell>
                    <TableCell>
                      {r.changedFields ? Object.keys(r.changedFields as Record<string, unknown>).join(", ") : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.approvedAt ? "APPROVED" : "PENDING"} />
                    </TableCell>
                    <TableCell>{day(r.createdAt)}</TableCell>
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