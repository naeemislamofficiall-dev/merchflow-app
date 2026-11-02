import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MonthGrid, parseMonth, ymd, type CalEvent } from "@/components/calendar/month-grid";
import { can, requireUser } from "@/lib/permissions";
import { tnaViewService } from "@/services/tna-view.service";

const TONE = { OK: "muted", AT_RISK: "warn", OVERDUE: "bad", SHIPMENT_RISK: "bad" } as const;

export default async function TnaCalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  if (!can(user, "tna.view")) redirect("/dashboard");
  const { m } = await searchParams;
  const mon = parseMonth(m);
  const tasks = await tnaViewService.calendar(mon.start, mon.end);

  const events: CalEvent[] = tasks.map((t) => ({
    date: ymd(t.date),
    label: `${t.order ?? t.style}: ${t.name}`,
    href: `/tna/${t.planId}`,
    tone: t.status === "COMPLETED" ? "ok" : TONE[t.risk],
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="T&A calendar" description="Milestones by revised (or planned) date. Green = done, amber = at risk, red = overdue / shipment risk." />
      <MonthGrid year={mon.y} month={mon.mo} events={events} basePath="/tna/calendar" prev={mon.prev} next={mon.next} />
    </div>
  );
}
