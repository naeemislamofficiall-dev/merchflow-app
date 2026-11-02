import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { approvalService } from "@/services/approval.service";
import { ApprovalButtons } from "../approval-buttons";
import { WhoIsPending } from "../who-is-pending";

const ENTITY_HREF: Record<string, (id: string) => string> = {
  PurchaseOrder: (id) => `/purchase-orders/${id}`,
  PurchaseRequisition: (id) => `/prs/${id}`,
  CostSheet: (id) => `/costing/${id}`,
  Shipment: (id) => `/shipments/${id}`,
  SampleRequest: (id) => `/samples/${id}`,
};

export default async function ApprovalDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();

  const d = await approvalService.requestDetail(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  const req = d.req;
  const href = ENTITY_HREF[req.entityType]?.(req.entityId);

  return (
    <div className="space-y-4">
      <PageHeader
        title={req.title}
        description={`${req.entityType} - requested by ${req.requestedBy.name}`}
        actions={
          <Link href="/approvals" className="text-sm text-denim-700 hover:underline">
            Back to approvals
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <StatusBadge status={req.status} />
            {req.amount !== null && <span>Amount: {Number(req.amount).toFixed(2)}</span>}
            <span className="text-muted-foreground">Requested {req.requestedAt.toISOString().slice(0, 10)}</span>
          </div>
          {req.description && <p className="text-muted-foreground">{req.description}</p>}
          {href && (
            <Link href={href} className="block text-denim-700 hover:underline">
              Open the record
            </Link>
          )}
          {req.status === "PENDING" && can(user, "approval.decide") && <ApprovalButtons id={req.id} mode="decide" />}
        </CardContent>
      </Card>
      <WhoIsPending id={id} />
    </div>
  );
}