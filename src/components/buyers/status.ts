export type StatusKind = "active" | "hold" | "inactive";

export const statusKind = (s: string): StatusKind => {
  const u = s.toUpperCase();
  return u === "ACTIVE" ? "active" : u.includes("HOLD") ? "hold" : "inactive";
};

const human = (s: string) => {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function statusUi(s: string) {
  const k = statusKind(s);
  if (k === "active") return { label: "Active", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (k === "hold") return { label: "On Hold", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
  return { label: human(s) || "Inactive", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}