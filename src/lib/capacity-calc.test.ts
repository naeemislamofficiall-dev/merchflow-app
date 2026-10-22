import { describe, expect, it } from "vitest";
import {
  availableMinutes,
  bucketKey,
  capacityGap,
  countWorkingDays,
  exceedsOrderQty,
  isOverloaded,
  lineDailyPcs,
  lineDayLoads,
  lineMinutesPerDay,
  loadPct,
  overloadedLineDays,
  remainingToPlan,
  requiredMinutes,
  workingDayKeys,
} from "./capacity-calc";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const line = { operators: 40, efficiencyPct: 80, minutesPerDay: 480 };

describe("working days", () => {
  it("skips Friday by default", () => {
    // Sat 24 .. Fri 30 Oct 2026 = 6 working days (Friday off)
    expect(countWorkingDays(d("2026-10-24"), d("2026-10-30"))).toBe(6);
  });

  it("skips holidays too", () => {
    const keys = workingDayKeys(d("2026-10-24"), d("2026-10-30"), { holidays: ["2026-10-27"] });
    expect(keys).toHaveLength(5);
    expect(keys).not.toContain("2026-10-27");
    expect(keys).not.toContain("2026-10-30");
  });

  it("supports custom weekend days", () => {
    // Sat + Sun off: Mon-Fri = 5 days in 24..30 Oct
    expect(countWorkingDays(d("2026-10-24"), d("2026-10-30"), { weekendDays: [6, 0] })).toBe(5);
  });

  it("returns 0 when to is before from", () => {
    expect(countWorkingDays(d("2026-10-30"), d("2026-10-24"))).toBe(0);
  });
});

describe("available capacity", () => {
  it("operators x minutes x efficiency", () => {
    expect(lineMinutesPerDay(line)).toBe(15360);
  });

  it("defaults efficiency to 100%", () => {
    expect(lineMinutesPerDay({ operators: 10, efficiencyPct: null, minutesPerDay: 480 })).toBe(4800);
  });

  it("is 0 when operators are missing", () => {
    expect(lineMinutesPerDay({ operators: null, efficiencyPct: 80, minutesPerDay: 480 })).toBe(0);
  });

  it("multiplies by working days", () => {
    expect(availableMinutes(line, 5)).toBe(76800);
    expect(availableMinutes(line, 0)).toBe(0);
  });

  it("converts minutes to daily pcs by SMV", () => {
    expect(lineDailyPcs(line, 12.5)).toBe(1228);
    expect(lineDailyPcs(line, 0)).toBe(0);
  });
});

describe("required capacity and gap (hand-calculated)", () => {
  // 5 working days, 1 line, 5000 pcs, SMV 12.5
  const available = availableMinutes(line, countWorkingDays(d("2026-10-24"), d("2026-10-30"), { holidays: ["2026-10-27"] }));
  const required = requiredMinutes(5000, 12.5);

  it("available 76,800 and required 62,500", () => {
    expect(available).toBe(76800);
    expect(required).toBe(62500);
  });

  it("gap is +14,300 (enough capacity)", () => {
    expect(capacityGap(available, required)).toBe(14300);
  });

  it("gap is negative when the order is too big", () => {
    expect(capacityGap(available, requiredMinutes(8000, 12.5))).toBe(-23200);
  });

  it("load percentage", () => {
    expect(loadPct(62500, 76800)).toBe(81.4);
    expect(loadPct(100, 0)).toBeNull();
  });
});

describe("overload", () => {
  it("planned equal to available is not overloaded", () => {
    expect(isOverloaded(15360, 15360)).toBe(false);
    expect(isOverloaded(15361, 15360)).toBe(true);
  });

  it("finds overloaded line-days", () => {
    const loads = lineDayLoads([
      { lineId: "L1", dateKey: "2026-10-26", plannedQty: 1228, smv: 12.5 }, // 15,350 ok
      { lineId: "L1", dateKey: "2026-10-28", plannedQty: 1300, smv: 12.5 }, // 16,250 over
      { lineId: "L2", dateKey: "2026-10-28", plannedQty: 600, smv: 12.5 }, // 7,500 ok
    ]);
    const lineMinutes = new Map([
      ["L1", 15360],
      ["L2", 15360],
    ]);
    const over = overloadedLineDays(loads, lineMinutes);
    expect(over).toHaveLength(1);
    expect(over[0]).toMatchObject({ lineId: "L1", dateKey: "2026-10-28", overByMinutes: 890 });
  });

  it("adds up allocations of the same line and day", () => {
    const loads = lineDayLoads([
      { lineId: "L1", dateKey: "2026-10-26", plannedQty: 500, smv: 10 },
      { lineId: "L1", dateKey: "2026-10-26", plannedQty: 200, smv: 20 },
    ]);
    expect(loads).toHaveLength(1);
    expect(loads[0].plannedMinutes).toBe(9000);
    expect(loads[0].plannedQty).toBe(700);
  });

  it("a line with no capacity data is overloaded as soon as anything is planned", () => {
    const loads = lineDayLoads([{ lineId: "L9", dateKey: "2026-10-26", plannedQty: 1, smv: 10 }]);
    expect(overloadedLineDays(loads, new Map())).toHaveLength(1);
  });
});

describe("order quantity rule", () => {
  it("remaining to plan never goes below 0", () => {
    expect(remainingToPlan(20000, 12000)).toBe(8000);
    expect(remainingToPlan(20000, 25000)).toBe(0);
  });

  it("detects going over the order quantity", () => {
    expect(exceedsOrderQty(20000, 12000, 8000)).toBe(false);
    expect(exceedsOrderQty(20000, 12000, 8001)).toBe(true);
  });
});

describe("buckets", () => {
  it("daily keeps the date", () => {
    expect(bucketKey("2026-10-28", "daily")).toBe("2026-10-28");
  });

  it("weekly starts on Saturday", () => {
    expect(bucketKey("2026-10-28", "weekly")).toBe("2026-10-24"); // Wed -> Sat
    expect(bucketKey("2026-10-24", "weekly")).toBe("2026-10-24"); // Sat -> itself
    expect(bucketKey("2026-10-30", "weekly")).toBe("2026-10-24"); // Fri -> same week
    expect(bucketKey("2026-10-31", "weekly")).toBe("2026-10-31"); // next Sat -> new week
  });
});
