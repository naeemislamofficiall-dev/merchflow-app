import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { scheduledReportService } from "@/services/scheduled-report.service";
import { REPORTS } from "../../analytics/reports";
import { RowActions, ScheduleForm } from "./schedule-ui";

const fmt = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "-");

export default async function ScheduledReportsPage() {
  const user = await requireUser();
  if (!can(user, "reportschedule.view")) redirect("/dashboard");
  const canManage = can(user, "reportschedule.manage");
  const rows = await scheduledReportService.list();
  const titleOf = new Map(REPORTS.map((r) => [r.key, r.title]));

  return (
    <div className="space-y-4">
      <PageHeader title="Scheduled reports" description="Email a report to recipients every day at a set time" />
      {canManage && <ScheduleForm reports={REPORTS.map((r) => ({ key: r.key, title: r.title }))} />}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Last status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="h-20 text-center text-muted-foreground">No scheduled reports</TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{titleOf.get(s.reportKey) ?? s.reportKey}</TableCell>
                    <TableCell>{s.timeOfDay}</TableCell>
                    <TableCell>{s.format}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.recipients.join(", ")}</TableCell>
                    <TableCell>{s.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell>{fmt(s.lastRunAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.lastStatus ?? "-"}</TableCell>
                    <TableCell className="text-right">{canManage && <RowActions id={s.id} active={s.isActive} />}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}