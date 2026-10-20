import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { tnaService } from "@/services/tna.service";
import { RefreshButton } from "./refresh-button";
import { TaskActions } from "./task-actions";

const TABS: DetailTab[] = [{ key: "tasks", label: "Milestones" }];

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function TnaPlanPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const plan = await tnaService.getPlan(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!plan) notFound();

  const total = plan.tasks.length;
  const closed = plan.tasks.filter((t) => t.status === "COMPLETED" || t.status === "WAIVED").length;
  const delayed = plan.tasks.filter((t) => t.status === "DELAYED").length;
  const atRisk = plan.tasks.filter((t) => t.status === "AT_RISK").length;
  const nameById = new Map(plan.tasks.map((t) => [t.id, t.name]));

  return (
    <DetailPage
      code="T&A plan"
      title={`${plan.style.styleNo} - ${plan.style.name}`}
      basePath={`/tna/${id}`}
      tabs={TABS}
      activeTab="tasks"
      actions={<RefreshButton planId={id} />}
      kpis={[
        { label: "Ship date", value: day(plan.shipDate) },
        { label: "Milestones", value: total },
        { label: "Completed", value: `${closed} / ${total}`, tone: closed === total && total > 0 ? "good" : "default" },
        { label: "Delayed", value: delayed, tone: delayed > 0 ? "bad" : "good" },
        { label: "At risk", value: atRisk, tone: atRisk > 0 ? "warn" : "good" },
      ]}
      side={
        <>
          <SidePanelSection title="Related">
            <Link href={`/styles/${plan.styleId}`} className="block text-denim-700 hover:underline">
              Open the style
            </Link>
            {plan.orderId && (
              <Link href={`/orders/${plan.orderId}`} className="block text-denim-700 hover:underline">
                Open the order
              </Link>
            )}
          </SidePanelSection>
          <SidePanelSection title="How it works">
            <p className="text-muted-foreground">
              Dates are counted backwards from the ship date. Press Refresh statuses to mark late milestones as
              delayed and flag any risk to the ship date. Changing a date needs a reason.
            </p>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead>
              <TableHead>Milestone</TableHead>
              <TableHead>Depends on</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Revised</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.tasks.map((t, i) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium">{t.name}</span>
                  {t.delayReason && <p className="text-xs text-muted-foreground">Reason: {t.delayReason}</p>}
                </TableCell>
                <TableCell>{t.dependsOnId ? (nameById.get(t.dependsOnId) ?? "-") : "-"}</TableCell>
                <TableCell>{day(t.plannedDate)}</TableCell>
                <TableCell>{day(t.revisedDate)}</TableCell>
                <TableCell>{day(t.actualDate)}</TableCell>
                <TableCell>{t.delayDays > 0 ? `${t.delayDays} d` : "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <TaskActions
                    taskId={t.id}
                    status={t.status}
                    dueDate={(t.revisedDate ?? t.plannedDate).toISOString().slice(0, 10)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DetailPage>
  );
}