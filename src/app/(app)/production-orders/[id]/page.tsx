import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { productionOrderService } from "@/services/production-order.service";
import { ProductionActions } from "./production-actions";

const TABS: DetailTab[] = [{ key: "route", label: "Route" }];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  PLANNED: "Check the plan, then release it.",
  RELEASED: "Start production when the floor is ready.",
  IN_PROGRESS: "Production is running. Complete it when the last piece is done.",
  PAUSED: "Paused. Resume or complete it.",
  COMPLETED: "Completed. Close it to finish.",
  CLOSED: "This production order is closed.",
  CANCELLED: "This production order was cancelled.",
};

export default async function ProductionDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const po = await productionOrderService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!po) notFound();

  return (
    <DetailPage
      code={`${po.style.styleNo} - ${po.style.name}`}
      title={po.productionNo}
      status={po.status}
      basePath={`/production-orders/${id}`}
      tabs={TABS}
      activeTab="route"
      actions={<ProductionActions productionId={id} status={po.status} quantity={po.quantity} />}
      kpis={[
        { label: "Planned qty", value: po.quantity },
        { label: "Completed", value: po.completedQty },
        { label: "Start", value: day(po.startDate) },
        { label: "End", value: day(po.endDate) },
        { label: "Priority", value: po.priority },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/orders/${po.orderId}`} className="block text-denim-700 hover:underline">
              Order {po.order.orderNo}
            </Link>
            <p className="text-muted-foreground">Factory: {po.factory.code}</p>
            <p className="text-muted-foreground">Line: {po.line?.code ?? "-"}</p>
          </SidePanelSection>
          <SidePanelSection title="Cutting">
            <p className="text-muted-foreground">Allowance: {Number(po.allowancePct)}%</p>
            <p className="text-muted-foreground">Cut plans: {po.cutPlanCount}</p>
            <p className="text-muted-foreground">Planned output: {po.cutPlannedOutput}</p>
          </SidePanelSection>
          {po.pauseReason && (
            <SidePanelSection title="Pause reason">
              <p className="text-muted-foreground">{po.pauseReason}</p>
            </SidePanelSection>
          )}
          {po.overproductionReason && (
            <SidePanelSection title="Overproduction reason">
              <p className="text-muted-foreground">{po.overproductionReason}</p>
            </SidePanelSection>
          )}
          {po.remarks && (
            <SidePanelSection title="Remarks">
              <p className="text-muted-foreground">{po.remarks}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[po.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>
            Route: {po.route.code} - {po.route.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            {po.route.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="rounded-md border px-3 py-1 capitalize">{s.process.toLowerCase()}</span>
                {i < po.route.steps.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </DetailPage>
  );
}