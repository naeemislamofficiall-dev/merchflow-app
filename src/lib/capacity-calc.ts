// PPC / Capacity planning-er pure hisab (spec Sec 25). DB lage na, tai test kora jay.
// Shob date UTC midnight dhore hisab hoy (Prisma @db.Date-er moto).
// Weekday number: 0 = Sunday ... 5 = Friday, 6 = Saturday (getUTCDay()-er moto).

export type DateKey = string; // "YYYY-MM-DD"

export type WorkingCalendar = {
  weekendDays?: number[]; // na dile Friday off
  holidays?: DateKey[]; // FactoryHoliday theke
};

export type LineCapacityInput = {
  operators: number | null;
  efficiencyPct: number | null; // na dile 100
  minutesPerDay: number;
};

export type PlannedAllocation = {
  lineId: string;
  dateKey: DateKey;
  plannedQty: number;
  smv: number; // oi style-er total SMV
};

export type LineDayLoad = {
  lineId: string;
  dateKey: DateKey;
  plannedMinutes: number;
  plannedQty: number;
};

export const DEFAULT_WEEKEND_DAYS = [5];

export function dateKey(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

function parseKey(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

// from..to (duto-i dhore) moddhe kaj-er din, weekend ar holiday bad diye
export function workingDayKeys(from: Date, to: Date, cal: WorkingCalendar = {}): DateKey[] {
  const weekend = cal.weekendDays ?? DEFAULT_WEEKEND_DAYS;
  const holidays = new Set(cal.holidays ?? []);
  const out: DateKey[] = [];
  const cur = parseKey(dateKey(from));
  const end = parseKey(dateKey(to));
  while (cur <= end) {
    const key = dateKey(cur);
    if (!weekend.includes(cur.getUTCDay()) && !holidays.has(key)) out.push(key);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function countWorkingDays(from: Date, to: Date, cal: WorkingCalendar = {}): number {
  return workingDayKeys(from, to, cal).length;
}

// ---------- Available capacity ----------

// Ek lainer ek diner minute = operators x minutesPerDay x efficiency%
// Operators dewa na thakle 0 (data nei, tai ganona hobe na)
export function lineMinutesPerDay(line: LineCapacityInput): number {
  if (line.operators === null || line.operators <= 0) return 0;
  const eff = (line.efficiencyPct ?? 100) / 100;
  return line.operators * line.minutesPerDay * eff;
}

export function availableMinutes(line: LineCapacityInput, workingDays: number): number {
  return Math.max(workingDays, 0) * lineMinutesPerDay(line);
}

// SMV diye minute-ke pcs-e: ek diner kotota pcs banano jay
export function minutesToPcs(minutes: number, smv: number): number {
  if (smv <= 0) return 0;
  return Math.floor(minutes / smv);
}

export function lineDailyPcs(line: LineCapacityInput, smv: number): number {
  return minutesToPcs(lineMinutesPerDay(line), smv);
}

// ---------- Required / Planned ----------

export function requiredMinutes(qty: number, smv: number): number {
  return Math.max(qty, 0) * Math.max(smv, 0);
}

export function plannedMinutes(plannedQty: number, smv: number): number {
  return requiredMinutes(plannedQty, smv);
}

// ---------- Capacity gap ----------

// Gap = Available - Required. Ridhonatmok (negative) mane ghatti
export function capacityGap(available: number, required: number): number {
  return available - required;
}

export function loadPct(planned: number, available: number): number | null {
  if (available <= 0) return null;
  return Math.round((planned / available) * 1000) / 10;
}

// Overload = planned minute available-er cheye beshi (equal hole overload na)
export function isOverloaded(planned: number, available: number): boolean {
  return planned > available;
}

// ---------- Order qty rule ----------

// Allocation-er jog order qty-r beshi hobe na
export function remainingToPlan(orderQty: number, allocatedQty: number): number {
  return Math.max(orderQty - allocatedQty, 0);
}

export function exceedsOrderQty(orderQty: number, allocatedQty: number, addingQty: number): boolean {
  return allocatedQty + addingQty > orderQty;
}

// ---------- Line x Day load ----------

// Allocation list theke prottek (line, din)-er total minute ar pcs
export function lineDayLoads(allocations: PlannedAllocation[]): LineDayLoad[] {
  const map = new Map<string, LineDayLoad>();
  for (const a of allocations) {
    const key = `${a.lineId}|${a.dateKey}`;
    const cur = map.get(key) ?? { lineId: a.lineId, dateKey: a.dateKey, plannedMinutes: 0, plannedQty: 0 };
    cur.plannedMinutes += plannedMinutes(a.plannedQty, a.smv);
    cur.plannedQty += a.plannedQty;
    map.set(key, cur);
  }
  return [...map.values()];
}

// Overload hoyeche emon (line, din) gulo. lineMinutes = lineId -> ek diner available minute
export function overloadedLineDays(
  loads: LineDayLoad[],
  lineMinutes: Map<string, number>
): (LineDayLoad & { availableMinutes: number; overByMinutes: number })[] {
  const out: (LineDayLoad & { availableMinutes: number; overByMinutes: number })[] = [];
  for (const l of loads) {
    const available = lineMinutes.get(l.lineId) ?? 0;
    if (isOverloaded(l.plannedMinutes, available)) {
      out.push({ ...l, availableMinutes: available, overByMinutes: l.plannedMinutes - available });
    }
  }
  return out;
}

// ---------- Daily / Weekly bucket (capacity page-er toggle) ----------

// Hapta shuru Saturday (6), Bangladesh-er factory-r moto
export function bucketKey(key: DateKey, mode: "daily" | "weekly", weekStartDay = 6): DateKey {
  if (mode === "daily") return key;
  const d = parseKey(key);
  const back = (d.getUTCDay() - weekStartDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return dateKey(d);
}
