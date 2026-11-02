import Link from "next/link";
import { ArrowRight, Inbox, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "./animated-value";

/* ---------- Panel: shob widget-er common card ---------- */
export function Panel({
  title,
  subtitle,
  href,
  badge,
  icon: Icon,
  iconClass,
  aside,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  badge?: number;
  icon?: LucideIcon;
  iconClass?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-card border bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                iconClass ?? "bg-blue-50 text-blue-600"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div>
            <h2 className="font-heading text-base font-semibold">
              {title}
              {badge ? (
                <span className="ml-2 inline-block animate-badge-pop rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {badge}
                </span>
              ) : null}
            </h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {aside ??
          (href && (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-denim-600 hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8 animate-float text-slate-300" aria-hidden="true" />
      {children}
    </div>
  );
}

/* ---------- Donut chart ---------- */
export type DonutSlice = { label: string; value: number; color: string };

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 176,
  valueSize = 34,
  labelSize = 12,
}: {
  data: DonutSlice[];
  centerValue: string | number;
  centerLabel: string;
  size?: number;
  valueSize?: number;
  labelSize?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const visible = data.filter((d) => d.value > 0);
  const gap = visible.length > 1 ? 3 : 0; // segment-er majhe shada fnak

  const slices =
    total > 0
      ? visible.reduce<(DonutSlice & { start: number; len: number })[]>((acc, d) => {
          const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
          acc.push({ ...d, start, len: (d.value / total) * c });
          return acc;
        }, [])
      : [];

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={centerLabel} className="shrink-0">
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#e5e9f0" strokeWidth="26" />
        {slices.map((s, idx) => {
          const dash = Math.max(s.len - gap, 0.5);
          return (
            <circle
              key={s.label}
              className="donut-seg"
              style={{ "--c": c, "--d": `${idx * 110}ms` } as React.CSSProperties}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="26"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-(s.start + gap / 2)}
            />
          );
        })}
      </g>
      <text x="100" y="100" textAnchor="middle" fontSize={valueSize} fontWeight="700" className="fill-foreground">
        {centerValue}
      </text>
      <text x="100" y={100 + labelSize + 6} textAnchor="middle" fontSize={labelSize} className="fill-muted-foreground">
        {centerLabel}
      </text>
    </svg>
  );
}

/* ---------- Ring gauge (efficiency %) ---------- */
export const effColor = (p: number) => (p >= 85 ? "#10b981" : p >= 70 ? "#f59e0b" : "#ef4444");

export function RingGauge({
  pct,
  size = 84,
  color,
  label,
}: {
  pct: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const p = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const col = color ?? effColor(p);
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label ?? ""} ${Math.round(p)}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeOpacity="0.15" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={col}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
        className="ring-prog"
        style={{ "--c": c } as React.CSSProperties}
      />
      {label && (
        <text x="50" y="44" textAnchor="middle" fontSize="11" className="fill-muted-foreground">
          {label}
        </text>
      )}
      <text
        x="50"
        y={label ? 64 : 57}
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        className="fill-navy-800"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}

/* ---------- Target vs Actual bar chart ---------- */
export function PairedColumns({
  items,
}: {
  items: { label: string; target: number; actual: number }[];
}) {
  const rawMax = Math.max(...items.flatMap((i) => [i.target, i.actual]), 1);
  const step = niceStep(rawMax / 4);
  const top = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const ht = (v: number) => `${(v / top) * 100}%`;

  return (
    <div className="grid grid-cols-[2.5rem_1fr] gap-x-2">
      <div className="relative h-48">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2 text-[11px] text-muted-foreground"
            style={{ bottom: `${(t / top) * 100}%` }}
          >
            {compact(t)}
          </span>
        ))}
      </div>
      <div className="relative h-48">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 border-t border-slate-200/80"
            style={{ bottom: `${(t / top) * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end">
          {items.map((i, n) => (
            <div key={i.label} className="flex h-full flex-1 items-end justify-center gap-1.5">
              <div
                className="grow-y w-7 rounded-t-md bg-[#cfd9e8]"
                style={{ height: ht(i.target), "--d": `${200 + n * 80}ms` } as React.CSSProperties}
                title={`Target ${i.target}`}
              />
              <div
                className="grow-y w-7 rounded-t-md bg-linear-to-t from-blue-600 to-blue-500"
                style={{ height: ht(i.actual), "--d": `${260 + n * 80}ms` } as React.CSSProperties}
                title={`Actual ${i.actual}`}
              />
            </div>
          ))}
        </div>
      </div>
      <span />
      <div className="mt-2 flex">
        {items.map((i) => (
          <span key={i.label} className="flex-1 truncate text-center text-xs text-muted-foreground">
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Horizontal progress row (Top buyers) ---------- */
export function BarRow({
  label,
  right,
  pct,
  color,
  rank,
}: {
  label: string;
  right: string;
  pct: number;
  color: string;
  rank?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      {rank !== undefined && (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">{label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{right}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="grow-x h-full rounded-full"
            style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color, "--d": `${250 + (rank ?? 0) * 90}ms` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Sparkline (area line chart) ---------- */
export function Sparkline({ points, color = "#06b6d4" }: { points: number[]; color?: string }) {
  const w = 300;
  const h = 100;
  const pad = 10;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const xy = points.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = xy.length
    ? `${line} L${xy[xy.length - 1][0].toFixed(1)},${h} L${xy[0][0].toFixed(1)},${h} Z`
    : "";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Trend">
      <path
        d={area}
        fill={color}
        fillOpacity="0.15"
        className="fade-in"
        style={{ "--d": "600ms" } as React.CSSProperties}
      />
      <path
        d={line}
        pathLength={1}
        className="draw-line"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {xy.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="3.5"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
          className="fade-in"
          style={{ "--d": `${700 + i * 70}ms` } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

/* ---------- Efficiency bar with target (Line performance) ---------- */
export function TargetBar({
  label,
  pct,
  target,
  color,
  delay = 0,
}: {
  label: string;
  pct: number;
  target: number;
  color: string;
  delay?: number;
}) {
  return (
    <div className="grid grid-cols-[6rem_2.5rem_1fr_5.5rem] items-center gap-3 text-sm">
      <span className="truncate">{label}</span>
      <span className="font-medium">{pct}%</span>
      <div className="h-2 min-w-0 overflow-hidden rounded-full bg-muted">
        <div
          className="grow-x h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(2, pct))}%`, backgroundColor: color, "--d": `${250 + delay}ms` } as React.CSSProperties}
        />
      </div>
      <span className="text-right text-xs text-muted-foreground">Target {target}%</span>
    </div>
  );
}

/* ---------- Metric card (Merchandising / Procurement) ---------- */
/* ---------- Metric card (Merchandising / Procurement) ---------- */
export type MetricTheme = "red" | "amber" | "blue" | "violet" | "teal" | "green";

const METRIC: Record<
  MetricTheme,
  { bar: string; bg: string; icon: string; value: string; band: string; pill: string; wave: string }
> = {
  red: {
    bar: "before:bg-red-500",
    bg: "bg-linear-to-r from-red-50 via-red-50/60 to-white",
    icon: "bg-red-100 text-red-500",
    value: "text-red-700",
    band: "bg-red-50 text-slate-600",
    pill: "bg-red-100 text-red-600",
    wave: "#f87171",
  },
  amber: {
    bar: "before:bg-amber-400",
    bg: "bg-linear-to-r from-amber-50 via-amber-50/60 to-white",
    icon: "bg-amber-100 text-amber-600",
    value: "text-navy-800",
    band: "bg-amber-50 text-slate-600",
    pill: "bg-amber-100 text-amber-700",
    wave: "#fbbf24",
  },
  blue: {
    bar: "before:bg-blue-500",
    bg: "bg-card",
    icon: "bg-blue-100 text-blue-600",
    value: "text-navy-800",
    band: "bg-blue-50 text-blue-600",
    pill: "bg-blue-100 text-blue-600",
    wave: "#3b82f6",
  },
  violet: {
    bar: "before:bg-violet-500",
    bg: "bg-card",
    icon: "bg-violet-100 text-violet-600",
    value: "text-navy-800",
    band: "bg-violet-50 text-violet-600",
    pill: "bg-violet-100 text-violet-700",
    wave: "#8b5cf6",
  },
  teal: {
    bar: "before:bg-teal-500",
    bg: "bg-card",
    icon: "bg-teal-100 text-teal-600",
    value: "text-navy-800",
    band: "bg-teal-50 text-teal-700",
    pill: "bg-teal-100 text-teal-700",
    wave: "#14b8a6",
  },
  green: {
    bar: "before:bg-emerald-500",
    bg: "bg-card",
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-navy-800",
    band: "bg-emerald-50 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-700",
    wave: "#10b981",
  },
};

// card-er daner chhoto wave: shudhu real series dile dekhabe
function MiniWave({ points, color }: { points: number[]; color: string }) {
  const w = 100;
  const h = 36;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const xy = points.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${h} L${xy[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-24 shrink-0" aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  info,
  icon: Icon,
  theme,
  href,
  linkLabel,
  badge,
  corner: Corner,
  series,
}: {
  label: string;
  value: string | number;
  sub: string;
  info?: string;
  icon: LucideIcon;
  theme: MetricTheme;
  href: string;
  linkLabel: string;
  badge?: { label: string; theme: MetricTheme };
  corner?: LucideIcon;
  series?: number[];
}) {
  const T = METRIC[theme];
  const long = String(value).length > 6;
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-slate-200/70 shadow-card",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.75",
        T.bar,
        T.bg
      )}
    >
      <div className="flex flex-1 items-stretch gap-3 p-4 pb-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", T.icon)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-navy-800">{label}</p>
            {info && (
              <span title={info} className="cursor-help text-slate-400">
                <Info className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 whitespace-nowrap font-sans font-bold leading-tight tabular-nums",
              long ? "text-xl" : "text-3xl",
              T.value
            )}
          >
           <AnimatedValue value={value} />
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
        </div>
        {(badge || Corner || (series && series.length > 1)) && (
          <div className="flex shrink-0 flex-col items-end justify-between gap-2">
            {badge ? (
                            <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[13px] font-semibold",
                  METRIC[badge.theme].pill
                )}
              >
                {badge.theme === "red" && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
                {badge.label}
              </span>
            ) : Corner ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-denim-600">
                <Corner className="h-4 w-4" />
              </span>
            ) : (
              <span />
            )}
            {series && series.length > 1 && <MiniWave points={series} color={T.wave} />}
          </div>
        )}
      </div>
      <Link
        href={href}
        className={cn(
          "group mx-3 mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:brightness-95",
          T.band
        )}
      >
        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", T.icon)}>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
        {linkLabel}
      </Link>
    </div>
  );
}

/* ---------- Insight card (Business performance-er bhitorer card) ---------- */
export function InsightCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  aside,
  children,
}: {
  icon: LucideIcon;
  iconClass?: string;
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconClass ?? "bg-blue-50 text-blue-600"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}


/* ---------- Dui rokom bar (Receivables vs Payables) ---------- */
const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${Math.round(n)}`;

// 1 / 2 / 5 x 10^n: y-axis-er shundor onko
function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

export function DualBars({
  items,
  aLabel,
  bLabel,
}: {
  items: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
}) {
  const rawMax = Math.max(...items.flatMap((i) => [i.a, i.b]), 1);
  const step = niceStep(rawMax / 3);
  const top = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const ht = (v: number) => `${(v / top) * 100}%`;

  return (
    <div className="mt-3 grid grid-cols-[2.75rem_1fr] gap-x-2">
      <div className="relative h-40">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2 text-[11px] text-muted-foreground"
            style={{ bottom: `${(t / top) * 100}%` }}
          >
            {compact(t)}
          </span>
        ))}
      </div>
      <div className="relative h-40">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 border-t border-slate-200/80"
            style={{ bottom: `${(t / top) * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end">
          {items.map((i, n) => (
            <div key={i.label} className="flex h-full flex-1 items-end justify-center gap-1">
              <div
                className="grow-y w-4 rounded-t-md bg-blue-500"
                style={{ height: ht(i.a), "--d": `${200 + n * 90}ms` } as React.CSSProperties}
                title={`${aLabel}: ${Math.round(i.a)}`}
              />
              <div
                className="grow-y w-4 rounded-t-md bg-teal-500"
                style={{ height: ht(i.b), "--d": `${270 + n * 90}ms` } as React.CSSProperties}
                title={`${bLabel}: ${Math.round(i.b)}`}
              />
            </div>
          ))}
        </div>
      </div>
      <span />
      <div className="mt-2 flex">
        {items.map((i) => (
          <span key={i.label} className="flex-1 text-center text-xs text-muted-foreground">
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Rank row (Top 5 profit making orders) ---------- */
export function RankRow({
  rank,
  label,
  pct,
  bar,
  color,
  hint,
}: {
  rank: number;
  label: string;
  pct: number;
  bar: number;
  color: string;
  hint?: string;
}) {
  return (
    <div
      className="grid grid-cols-[1rem_minmax(0,6rem)_1fr_2.75rem] items-center gap-x-3 text-sm"
      title={hint}
    >
      <span className="text-xs font-semibold text-slate-500">{rank}</span>
      <span className="truncate font-medium text-navy-800">{label}</span>
      <div className="border-l pl-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="grow-x h-full rounded-full"
            style={{ width: `${Math.max(3, Math.min(100, bar))}%`, backgroundColor: color, "--d": `${250 + rank * 90}ms` } as React.CSSProperties}
          />
        </div>
      </div>
      <span className="text-right text-xs text-slate-600">{pct}%</span>
    </div>
  );
}