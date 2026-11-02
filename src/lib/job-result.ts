// Background job-er pure helper: job key list, outcome text, error/duration.

export const JOB_KEYS = [
  "tna-overdue-alerts",
  "supplier-late-reminders",
  "daily-kpi-snapshot",
  "scheduled-reports",
] as const;

export type JobKey = (typeof JOB_KEYS)[number];

export const JOB_LABELS: Record<JobKey, string> = {
  "tna-overdue-alerts": "T&A overdue alerts",
  "supplier-late-reminders": "Supplier late reminders",
  "daily-kpi-snapshot": "Daily KPI snapshot",
  "scheduled-reports": "Scheduled report emails",
};

export function isJobKey(s: string): s is JobKey {
  return (JOB_KEYS as readonly string[]).includes(s);
}

// { alerts: 3, skipped: 1 } -> "alerts: 3, skipped: 1"
export function formatOutcome(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "Nothing to do";
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
}

// JobRun.error-e rakhar jonno chhoto message
export function errorMessage(err: unknown, max = 1000): string {
  let msg: string;
  if (err instanceof Error) msg = err.message;
  else if (typeof err === "string") msg = err;
  else {
    try {
      msg = JSON.stringify(err) ?? "";
    } catch {
      msg = "";
    }
  }
  msg = msg.trim() || "Unknown error";
  return msg.length > max ? `${msg.slice(0, max - 1)}…` : msg;
}

export function elapsedMs(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime());
}