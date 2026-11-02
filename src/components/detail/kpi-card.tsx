import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "@/components/dashboard/animated-value";

export type KpiTone = "default" | "good" | "warn" | "bad";
export type KpiAccent = "blue" | "purple" | "green" | "orange" | "red" | "teal";

export type KpiItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  accent?: KpiAccent;
  icon?: LucideIcon;
  trend?: { value: string; up: boolean; label?: string };
};

/* ---- accent chhara (onno page-er purono look) ---- */
const TONE_TEXT: Record<KpiTone, string> = {
  default: "text-foreground",
  good: "text-emerald-700",
  warn: "text-gold-600",
  bad: "text-destructive",
};
const TONE_CARD: Record<KpiTone, string> = {
  default: "bg-card border-border",
  good: "bg-card border-border",
  warn: "bg-amber-50/70 border-amber-200",
  bad: "bg-red-50/70 border-red-200",
};
const TONE_ICON: Record<KpiTone, string> = {
  default: "bg-denim-50 text-denim-600",
  good: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-100 text-gold-600",
  bad: "bg-red-100 text-destructive",
};

/* ---- accent: pastel card + gaadho→halka gradient icon ---- */
const ACCENT: Record<KpiAccent, { card: string; icon: string; pulse: string }> = {
  blue: {
    card: "border-blue-200/80 bg-linear-to-br from-blue-100/70 via-blue-50 to-white",
    icon: "from-blue-700 to-blue-400 shadow-blue-500/30",
    pulse: "text-blue-500",
  },
  purple: {
    card: "border-violet-200/80 bg-linear-to-br from-violet-100/70 via-violet-50 to-white",
    icon: "from-violet-700 to-violet-400 shadow-violet-500/30",
    pulse: "text-violet-500",
  },
  green: {
    card: "border-emerald-200/80 bg-linear-to-br from-emerald-100/70 via-emerald-50 to-white",
    icon: "from-emerald-700 to-emerald-400 shadow-emerald-500/30",
    pulse: "text-emerald-500",
  },
  orange: {
    card: "border-orange-200/80 bg-linear-to-br from-orange-100/70 via-orange-50 to-white",
    icon: "from-orange-600 to-amber-400 shadow-orange-500/30",
    pulse: "text-orange-500",
  },
  red: {
    card: "border-rose-200/80 bg-linear-to-br from-rose-100/70 via-rose-50 to-white",
    icon: "from-red-600 to-rose-400 shadow-red-500/30",
    pulse: "text-red-500",
  },
  teal: {
    card: "border-teal-200/80 bg-linear-to-br from-teal-100/70 via-teal-50 to-white",
    icon: "from-teal-700 to-teal-400 shadow-teal-500/30",
    pulse: "text-teal-500",
  },
};

export function KpiCard({ label, value, hint, tone = "default", accent, icon: Icon, trend }: KpiItem) {
  if (accent) {
    const A = ACCENT[accent];
    const risky = tone === "warn" || tone === "bad";
    const longValue = String(value).length > 8;

    return (
      <div
        className={cn(
          "group relative flex min-h-[9.75rem] flex-col rounded-card border p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
          A.card
        )}
      >
        {/* upore: icon + label + number */}
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={cn("shrink-0 rounded-full", A.pulse, risky && "animate-soft-pulse")}>
              <span
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-linear-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110",
                  A.icon
                )}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.38),transparent_58%)]"
                />
                <Icon className="relative h-5 w-5" strokeWidth={2.5} />
              </span>
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-navy-800">{label}</p>
            <p
              className={cn(
                "mt-0.5 whitespace-nowrap font-sans font-bold leading-tight tabular-nums text-navy-800",
                longValue ? "text-[22px]" : "text-[26px]"
              )}
            >
              <AnimatedValue value={value} />
            </p>
          </div>
        </div>

        {/* dan-e, number-er thik niche: ↑ 12% / vs. last month */}
        {trend && (
          <div className="absolute right-4 top-[3.9rem] text-right leading-tight">
            <p className={cn("text-[11px] font-semibold", trend.up ? "text-emerald-600" : "text-red-500")}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
            <p className="text-[9px] text-slate-500">{trend.label ?? "vs. last month"}</p>
          </div>
        )}

        {/* niche: footer text (kono line nai) */}
        {hint && <p className="mt-auto pt-5 text-[11px] text-slate-600">{hint}</p>}
      </div>
    );
  }

  /* accent chhara: purono layout */
  return (
    <div
      className={cn(
        "group rounded-card border p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        TONE_CARD[tone]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 font-heading text-2xl font-semibold", TONE_TEXT[tone])}>
            <AnimatedValue value={value} />
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
              TONE_ICON[tone],
              (tone === "warn" || tone === "bad") && "animate-soft-pulse"
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
      {trend && (
        <p className={cn("mt-1 text-xs font-medium", trend.up ? "text-emerald-700" : "text-destructive")}>
          {trend.up ? "↑" : "↓"} {trend.value} {trend.label ?? "vs. last month"}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}