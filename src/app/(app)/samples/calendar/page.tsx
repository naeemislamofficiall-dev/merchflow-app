import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MonthGrid, parseMonth, ymd, type CalEvent } from "@/components/calendar/month-grid";
import { can, requireUser } from "@/lib/permissions";
import { tnaViewService } from "@/services/tna-view.service";

const DONE = ["APPROVED", "REJECTED", "CANCELLED"];

export default async function SampleCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  if (!can(user, "sample.view")) redirect("/dashboard");
  const { m } = await searchParams;
  const mon = parseMonth(m);
  const rows = await tnaViewService.sampleCalendar(mon.start, mon.end);
  const todayKey = ymd(new Date());

  const events: CalEvent[] = rows.map((r) => {
    const key = ymd(r.date);
    const tone: CalEvent["tone"] =
      r.status === "APPROVED" ? "ok"
      : !DONE.includes(r.status) && key < todayKey ? "bad"
      : r.status === "SENT" || r.status === "BUYER_REVIEW" ? "warn"
      : "muted";
    return { date: key, label: `${r.sampleNo} ${r.type} (${r.style})`, href: `/samples/${r.id}`, tone };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Sample calendar" description="Samples by due date. Red = overdue and not finished, amber = waiting for buyer, green = approved." />
      <MonthGrid year={mon.y} month={mon.mo} events={events} basePath="/samples/calendar" prev={mon.prev} next={mon.next} />
    </div>
  );
}
