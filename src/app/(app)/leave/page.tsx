import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm, RowActions, type RowAction } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { leaveService } from "@/services/leave.service";
import { approveLeaveAction, cancelLeaveAction, createLeaveAction, rejectLeaveAction } from "./actions";

const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function LeavePage() {
  const user = await requireUser();
  if (!can(user, "leave.view")) redirect("/dashboard");

  const [{ rows, canRequest, canApprove }, opts] = await Promise.all([
    leaveService.list(),
    can(user, "leave.request") ? leaveService.formOptions() : Promise.resolve(null),
  ]);

  function actionsFor(status: string): RowAction[] {
    const a: RowAction[] = [];
    if (status === "PENDING" && canApprove) {
      a.push({ label: "Approve", variant: "default", action: approveLeaveAction });
      a.push({ label: "Reject", reason: "Reason for rejecting", action: rejectLeaveAction });
    }
    if ((status === "PENDING" || status === "APPROVED") && canRequest) {
      a.push({ label: "Cancel", confirm: "Cancel this leave request?", action: cancelLeaveAction });
    }
    return a;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave"
        description="Leave requests. Approved leave is marked in attendance automatically"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Request</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No leave requests yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requestNo}</TableCell>
                    <TableCell>{r.employee}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{day(r.fromDate)}</TableCell>
                    <TableCell>{day(r.toDate)}</TableCell>
                    <TableCell className="text-right">{r.days}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions id={r.id} actions={actionsFor(r.status)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {opts && (
        <CreateForm
          title="New leave request"
          submitLabel="Submit request"
          action={createLeaveAction}
          fields={[
            { name: "employeeId", label: "Employee", type: "select", required: true, options: opts.employees },
            { name: "leaveTypeId", label: "Leave type", type: "select", required: true, options: opts.types },
            { name: "fromDate", label: "From", type: "date", required: true },
            { name: "toDate", label: "To", type: "date", required: true },
            { name: "reason", label: "Reason" },
          ]}
        />
      )}
    </div>
  );
}
