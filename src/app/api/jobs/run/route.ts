import { after, NextResponse, type NextRequest } from "next/server";
import { isJobKey, JOB_KEYS, type JobKey } from "@/lib/job-result";
import { executeRun, queueRun } from "@/services/job-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// External cron: POST /api/jobs/run?job=<key> (job na dile shob) + header x-cron-secret
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = req.nextUrl.searchParams.get("job");
  if (job && !isJobKey(job)) return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  const keys = job && isJobKey(job) ? [job] : [...JOB_KEYS];
   const runs: { key: JobKey; run: { id: string } }[] = [];
  for (const k of keys) runs.push({ key: k, run: await queueRun(k, "CRON") });
  after(async () => {
    for (const r of runs) await executeRun(r.run.id, r.key);
  });
  return NextResponse.json({ queued: runs.map((r) => ({ job: r.key, runId: r.run.id })) }, { status: 202 });
}