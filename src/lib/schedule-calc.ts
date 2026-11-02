// Scheduled report-er "ekhon pathanor somoy hoyeche kina" hishab. Pure, company timezone-e.

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeOfDay(s: string): boolean {
  return TIME_RE.test(s);
}

export function timeOfDayToMinutes(s: string): number {
  const m = TIME_RE.exec(s);
  if (!m) throw new Error(`Invalid time of day: ${s}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

// Oi timezone-e tarikh (YYYY-MM-DD) ar din-er minute
export function zonedParts(date: Date, timeZone: string): { dateKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

export type DueInput = {
  timeOfDay: string;
  now: Date;
  lastRunAt: Date | null;
  timeZone: string;
  graceMinutes?: number; // default 180: server bondho thakle ei somoyer moddhe dhora jabe
};

// Din-e ekbar, schedule time-er por, grace-er moddhe.
export function isDue(input: DueInput): boolean {
  if (!isValidTimeOfDay(input.timeOfDay)) return false;
  const grace = input.graceMinutes ?? 180;
  const sched = timeOfDayToMinutes(input.timeOfDay);
  const now = zonedParts(input.now, input.timeZone);

  if (input.lastRunAt) {
    const last = zonedParts(input.lastRunAt, input.timeZone);
    // aj-i schedule time-er por already chole thakle abar noy
    if (last.dateKey === now.dateKey && last.minutes >= sched) return false;
  }
  const diff = now.minutes - sched;
  return diff >= 0 && diff <= grace;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// rangeDays = 7 mane ajke shoho last 7 din. null/0 hole range nai (shob data).
export function reportRange(
  rangeDays: number | null | undefined,
  now: Date,
  timeZone: string
): { from?: string; to?: string } {
  if (!rangeDays || rangeDays < 1) return {};
  const to = zonedParts(now, timeZone).dateKey;
  return { from: addDays(to, -(Math.floor(rangeDays) - 1)), to };
}