import { redirect } from "next/navigation";
import { CheckCircle2, CircleAlert, CircleCheck, Clock, ListChecks, Play, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { JobsArt } from "@/components/admin/jobs-art";
import { can, requireUser } from "@/lib/permissions";
import { jobService } from "@/services/job.service";
import { JobsHistory, type RunRow } from "./jobs-history";

const now = () => Date.now();
const utc = (d: Date) => `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;

function ago(d: Date, nowMs: number) {
  const mins = Math.max(0, Math.floor((nowMs - d.getTime()) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default async function JobsPage() {
  const user = await requireUser();
  if (!can(user, "job.view")) redirect("/dashboard");
  const canRun = can(user, "job.run");
  const [latest, recent] = await Promise.all([jobService.latestPerJob(), jobService.recent(50)]);
  const nowMs = now();

  const labelOf = new Map(latest.map((j) => [j.key as string, j.label] as const));
  const rows: RunRow[] = recent.map((r) => {
    const at = r.startedAt ?? r.createdAt;
    return {
      id: r.id,
      jobKey: r.jobKey,
      label: labelOf.get(r.jobKey) ?? r.jobKey,
      status: r.status,
      trigger: r.trigger,
      startedText: utc(at),
      ts: at.getTime(),
      duration: r.durationMs ?? null,
      result: r.error ?? r.summary ?? "-",
      isError: Boolean(r.error),
    };
  });

  const success = recent.filter((r) => r.status === "SUCCESS").length;
  const failed = recent.filter((r) => r.status === "FAILED").length;
  const lastRun = recent[0] ? (recent[0].startedAt ?? recent[0].createdAt) : null;

  const failedJobs = latest.filter((j) => j.run?.status === "FAILED").length;
  const okJobs = latest.filter((j) => j.run?.status === "SUCCESS").length;
  const allOk = latest.length > 0 && okJobs === latest.length;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Clock className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Background Jobs</h1>
              <p className="text-sm text-slate-500">Last runs, failures and manual run</p>
            </div>
          </div>
          <JobsArt className="pointer-events-none absolute -bottom-3 right-80 hidden h-28 xl:block" />
          <div
            className={cn(
              "relative flex items-center gap-3 rounded-2xl border bg-white/80 px-5 py-3 shadow-card backdrop-blur",
              failedJobs > 0 ? "border-rose-200" : "border-slate-100"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-white",
                failedJobs > 0 ? "bg-rose-500" : allOk ? "bg-emerald-500" : "bg-slate-400"
              )}
            >
              {failedJobs > 0 ? <TriangleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", failedJobs > 0 ? "text-rose-600" : "text-navy-800")}>
                {failedJobs > 0
                  ? `${failedJobs} job(s) failed`
                  : allOk
                    ? "All latest runs succeeded"
                    : "Not all jobs have succeeded yet"}
              </p>
              <p className="text-xs text-slate-500">
                {okJobs} of {latest.length} jobs have a successful latest run
              </p>
            </div>
          </div>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          big
          plain
          theme="blue"
          icon={ListChecks}
          label="Total runs"
          value={String(recent.length)}
          sub="Latest 50 runs"
        />
        <StatCard
          big
          plain
          theme="green"
          icon={CircleCheck}
          label="Successful"
          value={String(success)}
          sub="Status: Success"
        />
        <StatCard
          big
          plain
          theme={failed > 0 ? "red" : "green"}
          icon={CircleAlert}
          label="Failed"
          value={String(failed)}
          sub="Status: Failed"
        />
        <StatCard
          big
          plain
          theme="violet"
          icon={Play}
          label="Last run"
          value={lastRun ? ago(lastRun, nowMs) : "Never"}
          sub={lastRun ? utc(lastRun) : "No runs yet"}
        />
      </div>

      <JobsHistory
        rows={rows}
        jobs={latest.map((j) => ({ key: j.key, label: j.label }))}
        canRun={canRun}
        nowMs={nowMs}
      />
    </div>
  );
}