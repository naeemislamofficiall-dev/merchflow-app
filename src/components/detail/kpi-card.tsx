import { cn } from "@/lib/utils";

export type KpiTone = "default" | "good" | "warn" | "bad";

export type KpiItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
};

const TONE: Record<KpiTone, string> = {
  default: "text-foreground",
  good: "text-emerald-700",
  warn: "text-gold-600",
  bad: "text-destructive",
};

export function KpiCard({ label, value, hint, tone = "default" }: KpiItem) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-heading text-2xl font-semibold", TONE[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}