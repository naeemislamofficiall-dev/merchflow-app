import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { ScheduleArt } from "@/components/admin/schedule-art";
import { can, requireUser } from "@/lib/permissions";
import { scheduledReportService } from "@/services/scheduled-report.service";
import { REPORTS } from "../../analytics/reports";
import { ScheduleForm, SchedulesTable, type ScheduleRow } from "./schedule-ui";

const fmt = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "-");

export default async function ScheduledReportsPage() {
  const user = await requireUser();
  if (!can(user, "reportschedule.view")) redirect("/dashboard");
  const canManage = can(user, "reportschedule.manage");
  const list = await scheduledReportService.list();
  const titleOf = new Map(REPORTS.map((r) => [r.key, r.title]));

  const rows: ScheduleRow[] = list.map((s) => ({
    id: s.id,
    name: s.name,
    report: titleOf.get(s.reportKey) ?? s.reportKey,
    time: s.timeOfDay,
    format: s.format,
    recipients: s.recipients.join(", "),
    isActive: s.isActive,
    lastRun: fmt(s.lastRunAt),
    lastStatus: s.lastStatus ?? null,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <CalendarClock className="h-8 w-8" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Scheduled Reports</h1>
            <p className="text-sm text-slate-500">Email a report to recipients every day at a set time</p>
          </div>
          <ScheduleArt className="pointer-events-none absolute -bottom-3 right-0 hidden h-32 lg:block" />
        </header>
      </PageBand>

      {canManage && <ScheduleForm reports={REPORTS.map((r) => ({ key: r.key, title: r.title }))} />}

      <SchedulesTable rows={rows} canManage={canManage} />
    </div>
  );
}