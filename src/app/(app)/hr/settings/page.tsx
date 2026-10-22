import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateForm, RowActions } from "@/components/crud/crud-kit";
import { can, requireUser } from "@/lib/permissions";
import { hrService } from "@/services/hr.service";
import {
  createDesignationAction,
  createLeaveTypeAction,
  createShiftAction,
  toggleDesignationAction,
  toggleLeaveTypeAction,
  toggleShiftAction,
} from "../actions";

export default async function HrSettingsPage() {
  const user = await requireUser();
  if (!can(user, "hr.view")) redirect("/dashboard");
  const canManage = can(user, "hr.manage");
  const { designations, shifts, leaveTypes } = await hrService.listMasters();

  return (
    <div className="space-y-6">
      <PageHeader title="HR settings" description="Designations, shifts and leave types" />

      <Card>
        <CardHeader>
          <CardTitle>Designations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {designations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    None yet
                  </TableCell>
                </TableRow>
              ) : (
                designations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.code}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {canManage && <RowActions id={d.id} actions={[{ label: d.isActive ? "Deactivate" : "Activate", action: toggleDesignationAction }]} />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CreateForm
          title="Add designation"
          columns={2}
          action={createDesignationAction}
          fields={[
            { name: "code", label: "Code", required: true, hint: "Example: OP, SUP" },
            { name: "name", label: "Name", required: true },
          ]}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shifts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Break (min)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    None yet
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      {s.startTime} - {s.endTime}
                    </TableCell>
                    <TableCell className="text-right">{s.breakMinutes}</TableCell>
                    <TableCell>{s.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {canManage && <RowActions id={s.id} actions={[{ label: s.isActive ? "Deactivate" : "Activate", action: toggleShiftAction }]} />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CreateForm
          title="Add shift"
          action={createShiftAction}
          fields={[
            { name: "code", label: "Code", required: true },
            { name: "name", label: "Name", required: true },
            { name: "startTime", label: "Start (24h)", required: true, defaultValue: "08:00" },
            { name: "endTime", label: "End (24h)", required: true, defaultValue: "17:00" },
            { name: "breakMinutes", label: "Break (minutes)", type: "number", defaultValue: "60" },
          ]}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leave types</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Days per year</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    None yet
                  </TableCell>
                </TableRow>
              ) : (
                leaveTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="text-right">{t.annualDays || "No limit"}</TableCell>
                    <TableCell>{t.isPaid ? "Yes" : "No"}</TableCell>
                    <TableCell>{t.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      {canManage && <RowActions id={t.id} actions={[{ label: t.isActive ? "Deactivate" : "Activate", action: toggleLeaveTypeAction }]} />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CreateForm
          title="Add leave type"
          action={createLeaveTypeAction}
          fields={[
            { name: "code", label: "Code", required: true, hint: "Example: CL, SL" },
            { name: "name", label: "Name", required: true },
            { name: "annualDays", label: "Days per year", type: "number", defaultValue: "0", hint: "0 means no limit" },
            {
              name: "isPaid",
              label: "Paid leave?",
              type: "select",
              defaultValue: "YES",
              options: [
                { value: "YES", label: "Paid" },
                { value: "NO", label: "Unpaid" },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
