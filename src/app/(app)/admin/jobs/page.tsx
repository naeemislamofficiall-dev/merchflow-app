import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, requireUser } from "@/lib/permissions";
import { jobService } from "@/services/job.service";
import { RunNowButton } from "./run-now-button";

const fmt = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "-");
const tone = (s: string) =>
  s === "FAILED" ? "text-red-600 font-medium" : s === "SUCCESS" ? "text-green-700" : "text-muted-foreground";

export default async function JobsPage() {
  const user = await requireUser();
  if (!can(user, "job.view")) redirect("/dashboard");
  const canRun = can(user, "job.run");
  const [latest, recent] = await Promise.all([jobService.latestPerJob(), jobService.recent(50)]);

  return (
    <div className="space-y-4">
      <PageHeader title="Background jobs" description="Last runs, failures and manual run" />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Job</TableHead>
                <TableHead>Last status</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Result / error</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {latest.map((j) => (
                <TableRow key={j.key}>
                  <TableCell>{j.label}</TableCell>
                  <TableCell className={j.run ? tone(j.run.status) : ""}>{j.run?.status ?? "Never run"}</TableCell>
                  <TableCell>{fmt(j.run?.startedAt ?? j.run?.createdAt ?? null)}</TableCell>
                  <TableCell className="max-w-md truncate">{j.run?.error ?? j.run?.summary ?? "-"}</TableCell>
                  <TableCell className="text-right">{canRun && <RunNowButton jobKey={j.key} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold">Recent runs</h2>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Duration (ms)</TableHead>
                <TableHead>Result / error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No runs yet</TableCell>
                </TableRow>
              ) : (
                recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.jobKey}</TableCell>
                    <TableCell className={tone(r.status)}>{r.status}</TableCell>
                    <TableCell>{r.trigger}</TableCell>
                    <TableCell>{fmt(r.startedAt ?? r.createdAt)}</TableCell>
                    <TableCell className="text-right">{r.durationMs ?? "-"}</TableCell>
                    <TableCell className="max-w-md truncate">{r.error ?? r.summary ?? "-"}</TableCell>
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