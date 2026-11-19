import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "@/components/dashboard/animated-value";
import { compact } from "./format";

/* ---------- KPI tile ---------- */
const TILE = {
  blue: { card: "from-blue-50", circle: "bg-blue-100" },
  green: { card: "from-emerald-50", circle: "bg-emerald-100" },
  violet: { card: "from-violet-50", circle: "bg-violet-100" },
  teal: { card: "from-teal-50", circle: "bg-teal-100" },
};

export type Delta = { text: string; up: boolean; good: boolean } | null;

export function ProfitTile({
  theme,
  art,
  label,
  value,
  unit,
  delta,
  deltaLabel,
}: {
  theme: keyof typeof TILE;
  art: ReactNode;
  label: string;
  value: string;
  unit?: string;
  delta: Delta;
  deltaLabel: string;
}) {
  const T = TILE[theme];
  const long = value.length > 12;
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-card border border-slate-100 bg-linear-to-br via-white to-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        T.card
      )}
    >
      <span
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110",
          T.circle
        )}
      >
        {art}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className={cn("font-bold leading-tight tabular-nums text-navy-800", long ? "text-xl" : "text-[26px]")}>
            <AnimatedValue value={value} />
          </span>
          {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
        </p>
      </div>
      {delta && (
        <div className="shrink-0 text-right leading-tight">
          <p className={cn("text-xs font-semibold", delta.good ? "text-emerald-600" : "text-rose-500")}>
            {delta.up ? "↑" : "↓"} {delta.text}
          </p>
          <p className="text-[10px] text-slate-400">{deltaLabel}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- icons ---------- */
export function ChartArt() {
  return (
    <span className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-200 shadow-lg shadow-blue-200/60 ring-1 ring-white">
      <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
        <rect x="5" y="22" width="8" height="14" rx="2" fill="#60a5fa" />
        <rect x="16" y="13" width="8" height="23" rx="2" fill="#3b82f6" />
        <rect x="27" y="4" width="8" height="32" rx="2" fill="#1d4ed8" />
      </svg>
    </span>
  );
}

export function MoneyBagArt({ symbol }: { symbol: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <path d="M11 3h10l-2.6 5h-4.8z" fill="#1d4ed8" />
      <path d="M16 7.5c-6.2 0-10.5 5-10.5 11.2 0 4.8 3.7 8.3 10.5 8.3s10.5-3.5 10.5-8.3C26.5 12.5 22.2 7.5 16 7.5z" fill="#3b82f6" />
      <text x="16" y="23.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        {symbol}
      </text>
    </svg>
  );
}

export function CoinsArt() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <ellipse cx="16" cy="24" rx="10" ry="4.2" fill="#15803d" />
      <ellipse cx="16" cy="19.5" rx="10" ry="4.2" fill="#16a34a" />
      <ellipse cx="16" cy="15" rx="10" ry="4.2" fill="#22c55e" />
      <ellipse cx="16" cy="10.5" rx="10" ry="4.2" fill="#4ade80" />
    </svg>
  );
}

export function BarsArt() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <rect x="4" y="16" width="7" height="12" rx="1.8" fill="#a78bfa" />
      <rect x="12.5" y="9" width="7" height="19" rx="1.8" fill="#7c3aed" />
      <rect x="21" y="3" width="7" height="25" rx="1.8" fill="#5b21b6" />
    </svg>
  );
}

export function PercentArt() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#14b8a6" />
      <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff">
        %
      </text>
    </svg>
  );
}

/* ---------- Profit trend (line + area, y-axis, tooltips) ---------- */
function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

export function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const W = 340;
  const H = 230;
  const L = 40;
  const R = 14;
  const T = 30;
  const B = 28;
  const vals = points.map((p) => p.value);
  const rawMax = Math.max(...vals, 1);
  const rawMin = Math.min(...vals, 0);
  const step = niceStep((rawMax - rawMin) / 4 || 1);
  const top = Math.ceil(rawMax / step) * step;
  const bottom = Math.floor(rawMin / step) * step;
  const n = Math.max(Math.round((top - bottom) / step), 1);
  const ticks = Array.from({ length: n + 1 }, (_, i) => bottom + i * step);

  const x = (i: number) => (points.length > 1 ? L + (i * (W - L - R)) / (points.length - 1) : L + (W - L - R) / 2);
  const y = (v: number) => T + (1 - (v - bottom) / (top - bottom || 1)) * (H - T - B);

  const xy = points.map((p, i) => [x(i), y(p.value)] as const);
  const line = xy.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${y(bottom).toFixed(1)} L${xy[0][0].toFixed(1)},${y(bottom).toFixed(1)} Z`;

  const peak = vals.indexOf(Math.max(...vals));
  const bx = Math.min(Math.max(xy[peak][0], L + 38), W - R - 38);
  const by = xy[peak][1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Profit trend">
      <defs>
        <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : "3 3"} />
          <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" className="fill-slate-500">
            {compact(t)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#profit-grad)" className="fade-in" style={{ "--d": "500ms" } as React.CSSProperties} />
      <path
        d={line}
        pathLength={1}
        className="draw-line"
        fill="none"
        stroke="#2563eb"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {xy.map(([px, py], i) => (
        <circle
          key={points[i].label}
          cx={px}
          cy={py}
          r="4"
          fill="#fff"
          stroke="#2563eb"
          strokeWidth="2.2"
          className="fade-in"
          style={{ "--d": `${600 + i * 80}ms` } as React.CSSProperties}
        >
          <title>{`${points[i].label}: ${compact(points[i].value)}`}</title>
        </circle>
      ))}

      {/* sobcheye beshi mash-er bubble */}
      <g className="fade-in" style={{ "--d": "900ms" } as React.CSSProperties}>
        <rect x={bx - 34} y={by - 28} width="68" height="20" rx="6" fill="#fff" stroke="#e2e8f0" />
        <text x={bx} y={by - 14.5} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-navy-800">
          {`Margin ${compact(vals[peak])}`}
        </text>
      </g>

      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" className="fill-slate-500">
          {p.label}
        </text>
      ))}
    </svg>
  );
}