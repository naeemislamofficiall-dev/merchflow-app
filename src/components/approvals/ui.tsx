import { Check, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "@/components/dashboard/animated-value";

export const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2");

const TYPE_STYLE: Record<string, string> = {
  PurchaseOrder: "bg-blue-100 text-blue-700",
  PurchaseRequisition: "bg-violet-100 text-violet-700",
  CostSheet: "bg-teal-100 text-teal-700",
  Shipment: "bg-sky-100 text-sky-700",
  SampleRequest: "bg-pink-100 text-pink-700",
  MaterialIssue: "bg-amber-100 text-amber-700",
  StockAdjustment: "bg-orange-100 text-orange-700",
  CreditNote: "bg-rose-100 text-rose-700",
};

export function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
        TYPE_STYLE[type] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {humanize(type)}
    </span>
  );
}

export function Hero({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <header className="relative overflow-hidden rounded-card border bg-linear-to-r from-blue-50 via-white to-blue-50/60 p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <Icon className="h-8 w-8" fill="currentColor" fillOpacity={0.15} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {/* decoration */}
        <div aria-hidden="true" className="relative mr-4 hidden h-20 w-44 md:block">
          <div className="absolute right-10 top-0 h-[4.5rem] w-14 -rotate-6 space-y-2 rounded-xl border bg-white p-3 shadow-lg">
            <span className="block h-1.5 w-full rounded bg-blue-200" />
            <span className="block h-1.5 w-3/4 rounded bg-slate-200" />
            <span className="block h-1.5 w-full rounded bg-slate-200" />
          </div>
          <span className="absolute bottom-0 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-white">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
          <ShieldCheck className="absolute right-0 top-1 h-6 w-6 text-blue-300" />
        </div>
      </div>
    </header>
  );
}

const STAT = {
  blue: {
    card: "border-blue-200/70 from-blue-100/70 via-blue-50 to-white",
    icon: "bg-blue-100 text-blue-600",
    wave: "#3b82f6",
  },
  green: {
    card: "border-emerald-200/70 from-emerald-100/70 via-emerald-50 to-white",
    icon: "bg-emerald-100 text-emerald-600",
    wave: "#10b981",
  },
  violet: {
    card: "border-violet-200/70 from-violet-100/70 via-violet-50 to-white",
    icon: "bg-violet-100 text-violet-600",
    wave: "#8b5cf6",
  },
  orange: {
    card: "border-orange-200/70 from-orange-100/70 via-orange-50 to-white",
    icon: "bg-orange-100 text-orange-600",
    wave: "#f97316",
  },
  red: {
    card: "border-rose-200/70 from-rose-100/70 via-rose-50 to-white",
    icon: "bg-rose-100 text-rose-600",
    wave: "#f43f5e",
  },
  // golapi card, nil icon (Payables-er Overdue card-er jonno)
  pink: {
    card: "border-rose-200/60 from-rose-100/70 via-rose-50/70 to-white",
    icon: "bg-blue-100 text-blue-600",
    wave: "#f87171",
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  theme,
  unit,
  big,
  wave,
  plain,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub: string;
  theme: keyof typeof STAT;
  unit?: string;
  big?: boolean;
  wave?: boolean;
  plain?: boolean;
}) {
  const T = STAT[theme];
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-card border bg-linear-to-br p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        plain ? "border-slate-100 bg-white" : T.card
      )}
    >
      {/* sajanor chhaya (data na, chart na) */}
      {wave && (
        <svg
          aria-hidden="true"
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 right-0 h-14 w-2/5"
        >
          <path
            d="M0 52 C 25 50, 40 34, 70 38 S 115 22, 140 26 S 180 6, 200 10 L200 60 L0 60 Z"
            fill={T.wave}
            fillOpacity="0.16"
          />
        </svg>
      )}
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110",
          big ? "h-16 w-16" : "h-14 w-14",
          T.icon
        )}
      >
        <Icon className={big ? "h-7 w-7" : "h-6 w-6"} strokeWidth={2.2} />
      </span>
      <div className="relative min-w-0">
        <p className="text-sm font-medium text-navy-800">{label}</p>
        <p
          className={cn(
            "font-bold leading-tight tabular-nums text-navy-800",
            String(value).length > 11 ? "text-2xl" : "text-3xl"
          )}
        >
          <AnimatedValue value={value} />
          {unit && <span className="ml-1.5 align-top text-sm font-semibold text-slate-500">{unit}</span>}
        </p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

// header-er pichone ekdom halka nil band (dan-e fade hoye jaoa wave, kono kinara nei)
export function PageBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-card bg-linear-to-r from-blue-50/80 via-blue-50/40 to-transparent p-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 text-blue-300"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 55%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 55%)",
          }}
        >
        <path
          d="M0 120 L0 88 C 60 50, 110 80, 170 60 S 290 10, 350 50 S 470 90, 600 40 L600 120 Z"
          fill="currentColor"
          fillOpacity="0.16"
        />
        <path
          d="M120 120 L120 100 C 200 70, 260 100, 340 80 S 480 50, 600 78 L600 120 Z"
          fill="currentColor"
          fillOpacity="0.12"
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

// Payables-er boro bhora card icon
export function CardArt() {
  return (
    <span className="flex h-18 w-24 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white/70 shadow-card backdrop-blur">
      <svg viewBox="0 0 40 30" className="h-9 w-12" aria-hidden="true">
        <rect x="1" y="2" width="38" height="26" rx="5" fill="#2563eb" />
        <rect x="1" y="8" width="38" height="6" fill="#bfdbfe" />
        <rect x="6" y="19" width="12" height="4" rx="2" fill="#bfdbfe" />
      </svg>
    </span>
  );
}

// Expenses-er boro bhora icon
export function CartArt() {
  return (
    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-card">
      <svg viewBox="0 0 40 36" className="h-10 w-10" aria-hidden="true">
        <path d="M2 3h6l4 20h20l4-14H10" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 9h24l-3.5 12H15.5z" fill="#bfdbfe" />
        <circle cx="16" cy="31" r="3" fill="#2563eb" />
        <circle cx="30" cy="31" r="3" fill="#2563eb" />
      </svg>
    </span>
  );
}

// Expenses-er boro bhora icon
export function ExpenseArt() {
  return (
    <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/60 ring-1 ring-white">
      <svg viewBox="0 0 40 40" className="h-11 w-11" aria-hidden="true">
        <rect x="7" y="3" width="26" height="34" rx="5" fill="#2563eb" />
        <rect x="12" y="10" width="16" height="2.6" rx="1.3" fill="#bfdbfe" />
        <rect x="12" y="16" width="11" height="2.6" rx="1.3" fill="#bfdbfe" />
        <text x="20" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">$</text>
      </svg>
    </span>
  );
}


// Receivables-er boro bhora wallet icon
export function WalletArt() {
  return (
    <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-200 shadow-lg shadow-blue-200/60 ring-1 ring-white">
      <svg viewBox="0 0 40 36" className="h-11 w-11" aria-hidden="true">
        <rect x="2" y="6" width="36" height="26" rx="6" fill="#2563eb" />
        <path d="M6 6 L28 2 Q31 1.5 31 5 L31 6 Z" fill="#60a5fa" />
        <rect x="22" y="15" width="16" height="10" rx="5" fill="#1d4ed8" />
        <circle cx="29" cy="20" r="2.2" fill="#ffffff" />
      </svg>
    </span>
  );
}

/* ================= Finance KPI card (Receivables / Payables-er reference style) ================= */

// solid (bhora) icon, circle-er rong theke currentColor ney
export function DocFillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="currentColor" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5z" fill="#fff" fillOpacity="0.5" />
    </svg>
  );
}

export function CoinFillIcon({ symbol }: { symbol: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <text x="12" y="16.8" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
        {symbol}
      </text>
    </svg>
  );
}

export function CalendarFillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="17" rx="3.5" fill="currentColor" />
      <path d="M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <g fill="#fff">
        <rect x="6.5" y="11.5" width="3" height="3" rx="0.8" />
        <rect x="10.5" y="11.5" width="3" height="3" rx="0.8" />
        <rect x="14.5" y="11.5" width="3" height="3" rx="0.8" />
        <rect x="6.5" y="16" width="3" height="3" rx="0.8" />
        <rect x="10.5" y="16" width="3" height="3" rx="0.8" />
      </g>
    </svg>
  );
}

export function CheckFillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FIN = {
  blue: { card: "from-blue-50/70", circle: "bg-blue-100 text-blue-600", wave: "#60a5fa" },
  overdue: { card: "from-rose-50/70", circle: "bg-blue-100 text-blue-600", wave: "#f87171" },
  green: { card: "from-emerald-50/70", circle: "bg-emerald-100 text-emerald-600", wave: "#34d399" },
  violet: { card: "from-violet-50/70", circle: "bg-violet-100 text-violet-600", wave: "#a78bfa" },
  orange: { card: "from-orange-50/70", circle: "bg-orange-100 text-orange-500", wave: "#fb923c" },
};

// SHUDHU SAJANO: eta data-r trend na. Real trend chaile KpiSnapshot theke series pass korte hobe
function FinWave({ id, color }: { id: string; color: string }) {
  const line = "M0 46 L16 41 L30 44 L48 31 L62 35 L78 23 L92 27 L108 13 L120 17 L140 3";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 140 52"
      preserveAspectRatio="none"
      className="pointer-events-none absolute bottom-3 right-4 h-12 w-36"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${line} L140 52 L0 52 Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FinCard({
  art,
  label,
  value,
  unit,
  note,
  theme,
  wave = true,
}: {
  art: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  theme: keyof typeof FIN;
  wave?: boolean;
}) {
  const T = FIN[theme];
  const long = value.length > 11;
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-card border border-slate-100 bg-linear-to-br via-white to-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        T.card
      )}
    >
      {wave && <FinWave id={`finwave-${theme}`} color={T.wave} />}
      <span
        className={cn(
          "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110",
          T.circle
        )}
      >
        {art}
      </span>
      <div className="relative min-w-0">
        <p className="text-[15px] font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 whitespace-nowrap">
          <span className={cn("font-bold leading-tight tabular-nums text-navy-800", long ? "text-xl" : "text-[26px]")}>
            <AnimatedValue value={value} />
          </span>
          {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
          {note && <span className="text-xs font-semibold text-rose-500">{note}</span>}
        </p>
      </div>
    </div>
  );
 }
