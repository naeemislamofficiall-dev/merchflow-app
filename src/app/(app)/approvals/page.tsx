import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { approvalService } from "@/services/approval.service";
import { ApprovalButtons } from "./approval-buttons";
import { WorkflowForm } from "./workflow-form";

const ENTITY_HREF: Record<string, (id: string) => string> = {
  PurchaseOrder: (id) => `/purchase-orders/${id}`,
  PurchaseRequisition: (id) => `/prs/${id}`,
  CostSheet: (id) => `/costing/${id}`,
  Shipment: (id) => `/shipments/${id}`,
};

const day = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: unknown) =>
  n === null || n === undefined
    ? "-"
    : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

export default async function ApprovalsPage() {
  const user = await requireUser();
  const canDecide = can(user, "approval.decide");
  const canRequest = can(user, "approval.request");
  const canManage = can(user, "approval.manage");

  const pending = canDecide ? await approvalService.listPending() : null;
  const mine = canRequest ? await approvalService.listMine() : null;
  const workflows = canManage ? await approvalService.listWorkflows() : null;
  const roles = canManage
    ? await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const requesterIds = pending ? [...new Set(pending.map((r) => r.requestedById))] : [];
  const requesters = requesterIds.length
    ? await prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, email: true } })
    : [];
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "-";

  const titleCell = (type: string, id: string, title: string) => {
    const href = ENTITY_HREF[type]?.(id);
    return href ? (
      <Link href={href} className="font-medium text-denim-700 hover:underline">
        {title}
      </Link>
    ) : (
      <span className="font-medium">{title}</span>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Approvals" description="Requests waiting for a decision, your own requests and the approval rules" />

      {!canDecide && !canRequest && !canManage && (
        <p className="text-sm text-muted-foreground">Your role has no approval permissions.</p>
      )}

      {pending && (
        <Card>
          <CardHeader>
            <CardTitle>Waiting for me ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Request</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                      Nothing waiting for you
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{titleCell(r.entityType, r.entityId, r.title)}</TableCell>
                      <TableCell>{r.entityType}</TableCell>
                      <TableCell className="text-right">{money(r.amount)}</TableCell>
                      <TableCell>{r.workflow?.steps.find((s) => s.stepOrder === r.currentStep)?.name ?? "-"}</TableCell>
                      <TableCell>{requesters.find((u) => u.id === r.requestedById)?.email ?? "-"}</TableCell>
                      <TableCell>{day(r.requestedAt)}</TableCell>
                      <TableCell>
                        <ApprovalButtons id={r.id} mode="decide" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {mine && (
        <Card>
          <CardHeader>
            <CardTitle>My requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Request</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mine.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      You have not sent any request
                    </TableCell>
                  </TableRow>
                ) : (
                  mine.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{titleCell(r.entityType, r.entityId, r.title)}</TableCell>
                      <TableCell>{r.entityType}</TableCell>
                      <TableCell className="text-right">{money(r.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{day(r.requestedAt)}</TableCell>
                      <TableCell>{r.status === "PENDING" && <ApprovalButtons id={r.id} mode="cancel" />}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {workflows && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Approval rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Amount range</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                        No rules yet. Records are approved without a workflow
                      </TableCell>
                    </TableRow>
                  ) : (
                    workflows.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.code}</TableCell>
                        <TableCell>{w.name}</TableCell>
                        <TableCell>{w.entityType}</TableCell>
                        <TableCell>
                          {w.minAmount === null ? "0" : money(w.minAmount)} to {w.maxAmount === null ? "no limit" : money(w.maxAmount)}
                        </TableCell>
                        <TableCell>{w.steps.map((s) => `${s.stepOrder}. ${s.name} (${roleName(s.approverRoleId)})`).join(" → ")}</TableCell>
                        <TableCell>{w.isActive ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <WorkflowForm roles={roles} />
        </>
      )}
    </div>
  );
}