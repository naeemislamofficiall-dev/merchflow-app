import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { capaService } from "@/services/capa.service";
import { CapaPanel } from "./capa-panel";

const TABS: DetailTab[] = [{ key: "work", label: "Work" }];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

const NEXT: Record<string, string> = {
  OPEN: "Start the root cause analysis.",
  ROOT_CAUSE: "Write the root cause and the corrective action, pick an owner and a due date.",
  ACTION: "Do the action, then send it for verification.",
  VERIFICATION: "Check that the fix worked, write the verification note and close.",
  CLOSED: "This CAPA is closed.",
  CANCELLED: "This CAPA was cancelled.",
};

export default async function CapaDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const capa = await capaService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!capa) notFound();

  const users = await capaService.users().catch(() => []);
  const ownerName = users.find((u) => u.id === capa.ownerId)?.name ?? "-";
  const closed = capa.status === "CLOSED" || capa.status === "CANCELLED";

  return (
    <DetailPage
      code={capa.category ?? "CAPA"}
      title={`${capa.capaNo} - ${capa.title}`}
      status={capa.status}
      basePath={`/quality/capa/${id}`}
      tabs={TABS}
      activeTab="work"
      kpis={[
        { label: "Owner", value: ownerName },
        { label: "Due", value: day(capa.dueDate) || "-" },
        { label: "Created", value: day(capa.createdAt) },
        { label: "Closed", value: day(capa.closedAt) || "-" },
      ]}
      side={
        <>
          {capa.cancelReason && (
            <SidePanelSection title="Cancel reason">
              <p className="text-muted-foreground">{capa.cancelReason}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[capa.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Problem</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{capa.problem}</CardContent>
        </Card>

        {closed ? (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Root cause:</span> {capa.rootCause ?? "-"}
              </p>
              <p>
                <span className="font-medium">Corrective action:</span> {capa.correctiveAction ?? "-"}
              </p>
              <p>
                <span className="font-medium">Preventive action:</span> {capa.preventiveAction ?? "-"}
              </p>
              <p>
                <span className="font-medium">Verification:</span> {capa.verificationNote ?? "-"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <CapaPanel
            capaId={id}
            status={capa.status}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            initial={{
              rootCause: capa.rootCause ?? "",
              correctiveAction: capa.correctiveAction ?? "",
              preventiveAction: capa.preventiveAction ?? "",
              ownerId: capa.ownerId ?? "",
              dueDate: day(capa.dueDate),
              verificationNote: capa.verificationNote ?? "",
            }}
          />
        )}
      </div>
    </DetailPage>
  );
}