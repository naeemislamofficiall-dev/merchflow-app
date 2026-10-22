import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { hrService } from "@/services/hr.service";
import { createEmployeeAction } from "./actions";

export default async function EmployeesPage() {
  const user = await requireUser();
  if (!can(user, "hr.view")) redirect("/dashboard");

  const [{ rows, canSeePay, canManage }, opts] = await Promise.all([
    hrService.listEmployees(),
    can(user, "hr.manage") ? hrService.formOptions() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Employees" description="Workforce master: who works where, in which department and shift" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Joined</TableHead>
                {canSeePay && <TableHead className="text-right">Basic</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={canSeePay ? 8 : 7} className="h-20 text-center text-muted-foreground">
                    No employees yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/employees/${r.id}`} className="text-primary hover:underline">
                        {r.employeeNo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell>{r.factory}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.designation}</TableCell>
                    <TableCell>{r.joinDate.toISOString().slice(0, 10)}</TableCell>
                    {canSeePay && (
                      <TableCell className="text-right">{(r.basicSalary ?? 0).toLocaleString("en-US")}</TableCell>
                    )}
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
      {canManage && opts && (
        <CreateForm
          title="Add employee"
          submitLabel="Add employee"
          action={createEmployeeAction}
          fields={[
            { name: "fullName", label: "Full name", required: true },
            { name: "factoryId", label: "Factory", type: "select", required: true, options: opts.factories },
            { name: "departmentId", label: "Department", type: "select", options: opts.departments, emptyLabel: "None" },
            { name: "designationId", label: "Designation", type: "select", options: opts.designations, emptyLabel: "None" },
            { name: "shiftId", label: "Shift", type: "select", options: opts.shifts, emptyLabel: "None" },
            { name: "joinDate", label: "Join date", type: "date", required: true },
            { name: "phone", label: "Phone" },
            { name: "basicSalary", label: "Basic salary (monthly)", type: "number", defaultValue: "0" },
            { name: "allowance", label: "Allowance (monthly)", type: "number", defaultValue: "0" },
            { name: "overtimeRate", label: "Overtime rate (per hour)", type: "number", defaultValue: "0" },
          ]}
        />
      )}
    </div>
  );
}
