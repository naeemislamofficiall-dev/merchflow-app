import Link from "next/link";

export type CalEvent = { date: string; label: string; href?: string; tone?: "ok" | "warn" | "bad" | "muted" };

const TONE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-900",
  warn: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-900",
  muted: "bg-muted text-muted-foreground",
};

export const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Month "YYYY-MM" ke sanitize kore range ferot dey (UTC)
export function parseMonth(m?: string) {
  const now = new Date();
  const ok = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  const y = ok ? Number(m!.slice(0, 4)) : now.getUTCFullYear();
  const mo = ok ? Number(m!.slice(5, 7)) : now.getUTCMonth() + 1;
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  return { y, mo, start, end, key: `${y}-${String(mo).padStart(2, "0")}`, prev: shift(-1), next: shift(1) };
}

export function MonthGrid({
  year, month, events, basePath, prev, next,
}: {
  year: number; month: number; events: CalEvent[]; basePath: string; prev: string; next: string;
}) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = first.getUTCDay(); // 0 = Sunday
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const today = ymd(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <Link className="underline" href={`${basePath}?m=${prev}`}>&larr; Prev</Link>
        <strong>{first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</strong>
        <Link className="underline" href={`${basePath}?m=${next}`}>Next &rarr;</Link>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-px rounded-xl border bg-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-muted/50 px-2 py-1 text-xs font-medium">{d}</div>
          ))}
          {cells.map((day, i) => {
            const key = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const evs = day ? (byDay.get(key) ?? []) : [];
            return (
              <div key={i} className={`min-h-24 bg-background p-1 ${key === today ? "ring-2 ring-primary ring-inset" : ""}`}>
                {day && <div className="mb-1 text-xs text-muted-foreground">{day}</div>}
                <div className="space-y-1">
                  {evs.slice(0, 4).map((e, j) => {
                    const cls = `block truncate rounded px-1 py-0.5 text-xs ${TONE[e.tone ?? "muted"]}`;
                    return e.href ? (
                      <Link key={j} href={e.href} className={cls} title={e.label}>{e.label}</Link>
                    ) : (
                      <span key={j} className={cls} title={e.label}>{e.label}</span>
                    );
                  })}
                  {evs.length > 4 && <div className="text-xs text-muted-foreground">+{evs.length - 4} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
