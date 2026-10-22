import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { payrollService } from "@/services/payroll.service";
import { generatePayrollAction } from "./actions";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function PayrollPage() {
  const user = await requireUser();
  if (!can(user, "payroll.view")) redirect("/dashboard");

  const [{ rows, canGenerate }, factories] = await Promise.all([
    payrollService.list(),
    can(user, "payroll.generate") ? payrollService.factoryOptions() : Promise.resolve([]),
  ]);
  const now = new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll"
        description="Monthly pay from recorded attendance. Draft runs can be generated again before approval"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Period</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No payroll runs yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/payroll/${r.id}`} className="text-primary hover:underline">
                        {r.period}
                      </Link>
                    </TableCell>
                    <TableCell>{r.factory}</TableCell>
                    <TableCell className="text-right">{r.employeeCount}</TableCell>
                    <TableCell className="text-right">{money(r.totalGross)}</TableCell>
                    <TableCell className="text-right">{money(r.totalDeduction)}</TableCell>
                    <TableCell className="text-right">{money(r.totalNet)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canGenerate && (
        <CreateForm
          title="Generate payroll"
          columns={3}
          submitLabel="Generate"
          redirectBase="/payroll"
          action={generatePayrollAction}
          fields={[
            { name: "factoryId", label: "Factory", type: "select", required: true, options: factories },
            { name: "year", label: "Year", type: "number", required: true, defaultValue: String(now.getFullYear()) },
            {
              name: "month",
              label: "Month",
              type: "select",
              required: true,
              defaultValue: String(now.getMonth() + 1),
              options: MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
            },
          ]}
        />
      )}
    </div>
  );
}
