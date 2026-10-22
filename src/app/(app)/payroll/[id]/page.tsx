import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions, type RowAction } from "@/components/crud/crud-kit";
import { BusinessRuleError } from "@/lib/business-rules";
import { payrollService } from "@/services/payroll.service";
import { approvePayrollAction, cancelPayrollAction, markPayrollPaidAction } from "../actions";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PayrollDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const data = await payrollService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!data) notFound();
  const { run } = data;

  const actions: RowAction[] = [];
  if (run.status === "DRAFT" && data.canApprove) {
    actions.push({ label: "Approve payroll", variant: "gold", confirm: "Approve this payroll? Amounts can no longer be regenerated.", action: approvePayrollAction });
  }
  if (run.status === "APPROVED" && data.canPay) {
    actions.push({ label: "Mark as paid", variant: "gold", confirm: "Mark this payroll as paid?", action: markPayrollPaidAction });
  }
  if ((run.status === "DRAFT" || run.status === "APPROVED") && data.canApprove) {
    actions.push({ label: "Cancel payroll", reason: "Why is this payroll being cancelled?", action: cancelPayrollAction });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Payroll ${run.year}-${String(run.month).padStart(2, "0")}`}
        description={data.factory}
        actions={
          <>
            <StatusBadge status={run.status} />
            <Link href="/payroll" className="text-sm text-primary hover:underline">
              All payroll runs
            </Link>
          </>
        }
      />
      <RowActions id={run.id} actions={actions} />
      {run.status === "CANCELLED" && run.cancelReason && (
        <p className="text-sm text-muted-foreground">Cancelled: {run.cancelReason}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Employees", String(run.employeeCount)],
          ["Gross", money(Number(run.totalGross))],
          ["Deductions", money(Number(run.totalDeduction))],
          ["Net pay", money(Number(run.totalNet))],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Present</TableHead>
                <TableHead className="text-right">Absent</TableHead>
                <TableHead className="text-right">Leave</TableHead>
                <TableHead className="text-right">OT hrs</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowance</TableHead>
                <TableHead className="text-right">OT pay</TableHead>
                <TableHead className="text-right">Deduction</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <span className="font-medium">{l.employeeNo}</span> {l.fullName}
                  </TableCell>
                  <TableCell className="text-right">{l.presentDays}</TableCell>
                  <TableCell className="text-right">{l.absentDays}</TableCell>
                  <TableCell className="text-right">{l.leaveDays}</TableCell>
                  <TableCell className="text-right">{l.overtimeHours}</TableCell>
                  <TableCell className="text-right">{money(l.basic)}</TableCell>
                  <TableCell className="text-right">{money(l.allowance)}</TableCell>
                  <TableCell className="text-right">{money(l.overtimePay)}</TableCell>
                  <TableCell className="text-right">{money(l.deduction)}</TableCell>
                  <TableCell className="text-right font-medium">{money(l.netPay)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Daily rate is basic salary divided by the days in the month. Days with no attendance record are not deducted.
      </p>
    </div>
  );
}
