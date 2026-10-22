import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm, RowActions, type RowAction } from "@/components/crud/crud-kit";
import { dropEmpty, runAction } from "@/lib/action-result";
import { BusinessRuleError } from "@/lib/business-rules";
import { hrService } from "@/services/hr.service";
import {
  reactivateEmployeeAction,
  removeSkillAction,
  resignEmployeeAction,
  terminateEmployeeAction,
} from "../actions";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "Open");

export default async function EmployeeDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const data = await hrService.getEmployee(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!data) notFound();
  const e = data.employee;

  // এই কর্মীর জন্য আলাদা Server Action (id বন্ধ করা আছে)
  async function addSkill(values: Record<string, string>) {
    "use server";
    return runAction(async () => {
      const r = await hrService.addSkill(id, dropEmpty(values));
      return { id: r.id };
    });
  }
  async function allocate(values: Record<string, string>) {
    "use server";
    return runAction(async () => {
      const r = await hrService.allocate(id, dropEmpty(values));
      return { id: r.id };
    });
  }

  const statusActions: RowAction[] =
    e.status === "ACTIVE"
      ? [
          { label: "Mark resigned", reason: "Reason for resignation", action: resignEmployeeAction },
          { label: "Terminate", reason: "Reason for termination", action: terminateEmployeeAction },
        ]
      : [{ label: "Reactivate", confirm: "Make this employee active again?", action: reactivateEmployeeAction }];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${e.employeeNo} · ${e.fullName}`}
        description={`${data.factory} · ${data.department} · ${data.designation}`}
        actions={
          <>
            <StatusBadge status={e.status} />
            <Link href="/employees" className="text-sm text-primary hover:underline">
              All employees
            </Link>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            {day(e.joinDate)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift</p>
            {data.shift}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            {e.phone ?? "-"}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Exit date</p>
            {e.exitDate ? day(e.exitDate) : "-"}
          </div>
          {data.canSeePay && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Basic salary</p>
                {Number(e.basicSalary).toLocaleString("en-US")}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Allowance</p>
                {Number(e.allowance).toLocaleString("en-US")}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overtime rate / hour</p>
                {Number(e.overtimeRate).toLocaleString("en-US")}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {data.canManage && <RowActions id={e.id} actions={statusActions} />}

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Skill / operation</TableHead>
                <TableHead>Level (1-5)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.skills.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    No skills recorded
                  </TableCell>
                </TableRow>
              ) : (
                data.skills.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.skill}</TableCell>
                    <TableCell>{s.level}</TableCell>
                    <TableCell className="text-right">
                      {data.canManage && <RowActions id={s.id} actions={[{ label: "Remove", action: removeSkillAction }]} />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data.canManage && (
        <CreateForm
          title="Add skill"
          columns={3}
          action={addSkill}
          fields={[
            { name: "skill", label: "Skill / operation", required: true, hint: "Example: Collar attach, Overlock" },
            { name: "level", label: "Level (1-5)", type: "number", defaultValue: "3" },
          ]}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Line allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Line</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.allocations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    Not allocated to any line yet
                  </TableCell>
                </TableRow>
              ) : (
                data.allocations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.line}</TableCell>
                    <TableCell>{day(a.fromDate)}</TableCell>
                    <TableCell>{day(a.toDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data.canManage && e.status === "ACTIVE" && (
        <CreateForm
          title="Allocate to a line"
          columns={3}
          action={allocate}
          fields={[
            { name: "lineId", label: "Line", type: "select", required: true, options: data.lineOptions },
            { name: "fromDate", label: "From date", type: "date", required: true },
          ]}
        />
      )}
    </div>
  );
}
