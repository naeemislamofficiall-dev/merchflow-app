import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { can, requireUser } from "@/lib/permissions";
import { attendanceService } from "@/services/attendance.service";
import { AttendanceSheet } from "./attendance-sheet";

export default async function AttendancePage(props: { searchParams: Promise<{ factory?: string; date?: string }> }) {
  const user = await requireUser();
  if (!can(user, "attendance.view")) redirect("/dashboard");

  const sp = await props.searchParams;
  const factories = await attendanceService.factoryOptions();
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const factoryId = factories.some((f) => f.value === sp.factory) ? (sp.factory as string) : (factories[0]?.value ?? "");

  const sheet = factoryId ? await attendanceService.sheet(factoryId, date) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description="Record who came in and overtime hours, one factory and one day at a time" />
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="factory">
                Factory
              </label>
              <Select id="factory" name="factory" defaultValue={factoryId}>
                {factories.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="date">
                Date
              </label>
              <Input id="date" name="date" type="date" max={today} defaultValue={date} />
            </div>
            <Button type="submit" variant="outline">
              Show
            </Button>
          </form>
        </CardContent>
      </Card>
      {sheet ? (
        <AttendanceSheet
          key={`${factoryId}:${date}`}
          factoryId={factoryId}
          date={date}
          rows={sheet.rows}
          canRecord={sheet.canRecord}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No factory available</p>
      )}
    </div>
  );
}
