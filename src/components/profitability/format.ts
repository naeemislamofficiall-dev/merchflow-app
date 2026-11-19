export const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const compact = (n: number) => {
  const a = Math.abs(n);
  const s =
    a >= 1_000_000 ? `${+(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${Math.round(a / 1_000)}K` : `${Math.round(a)}`;
  return n < 0 ? `-${s}` : s;
};

export const PALETTE = ["#2563eb", "#14b8a6", "#8b5cf6", "#f97316", "#84cc16", "#ec4899", "#0ea5e9", "#f59e0b"];

// margin % onujayi pill-er rong
export const marginPill = (p: number) =>
  p >= 50
    ? "bg-emerald-100 text-emerald-700"
    : p >= 30
      ? "bg-blue-100 text-blue-700"
      : p >= 0
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-600";

// buyer-er rong: chena brand-er jonno fixed, baki naam theke
const BRAND: Record<string, string> = {
  "h&m": "bg-slate-900",
  zara: "bg-slate-900",
  mango: "bg-amber-500",
  primark: "bg-blue-600",
  walmart: "bg-sky-600",
};
const FALLBACK = ["bg-navy-800", "bg-emerald-600", "bg-violet-600", "bg-rose-500", "bg-teal-600", "bg-orange-500"];

export const buyerColor = (name: string) =>
  BRAND[name.trim().toLowerCase()] ??
  FALLBACK[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length];

export const buyerMark = (name: string) => {
  const n = name.trim();
  return n.length <= 3 ? n.toUpperCase() : n.charAt(0).toUpperCase() || "?";
};