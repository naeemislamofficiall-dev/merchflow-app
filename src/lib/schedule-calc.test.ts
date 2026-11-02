import { describe, expect, it } from "vitest";
import { isDue, isValidTimeOfDay, reportRange, timeOfDayToMinutes, zonedParts } from "./schedule-calc";

const TZ = "Asia/Dhaka"; // UTC+6, DST nai

describe("time of day", () => {
  it("validates HH:mm", () => {
    expect(isValidTimeOfDay("08:00")).toBe(true);
    expect(isValidTimeOfDay("23:59")).toBe(true);
    expect(isValidTimeOfDay("8:00")).toBe(false);
    expect(isValidTimeOfDay("24:00")).toBe(false);
    expect(isValidTimeOfDay("08:60")).toBe(false);
  });
  it("converts to minutes", () => {
    expect(timeOfDayToMinutes("08:30")).toBe(510);
    expect(() => timeOfDayToMinutes("x")).toThrow();
  });
});

describe("zonedParts", () => {
  it("crosses midnight into the next local day", () => {
    expect(zonedParts(new Date("2026-10-24T20:00:00Z"), TZ)).toEqual({ dateKey: "2026-10-25", minutes: 120 });
  });
});

describe("isDue", () => {
  const base = { timeOfDay: "08:00", timeZone: TZ };

  it("due after schedule time when never run", () => {
    // 02:30Z = 08:30 Dhaka
    expect(isDue({ ...base, now: new Date("2026-10-25T02:30:00Z"), lastRunAt: null })).toBe(true);
  });
  it("not due before schedule time", () => {
    // 01:59Z = 07:59 Dhaka
    expect(isDue({ ...base, now: new Date("2026-10-25T01:59:00Z"), lastRunAt: null })).toBe(false);
  });
  it("not due again if already ran today after schedule time", () => {
    const lastRunAt = new Date("2026-10-25T02:05:00Z"); // 08:05 Dhaka
    expect(isDue({ ...base, now: new Date("2026-10-25T02:30:00Z"), lastRunAt })).toBe(false);
  });
  it("due if last run was yesterday", () => {
    const lastRunAt = new Date("2026-10-24T02:00:00Z");
    expect(isDue({ ...base, now: new Date("2026-10-25T02:30:00Z"), lastRunAt })).toBe(true);
  });
  it("still due if today's earlier run was before schedule time (e.g. manual run)", () => {
    const lastRunAt = new Date("2026-10-25T00:30:00Z"); // 06:30 Dhaka
    expect(isDue({ ...base, now: new Date("2026-10-25T02:30:00Z"), lastRunAt })).toBe(true);
  });
  it("not due after grace window", () => {
    // 08:00Z = 14:00 Dhaka, 360 min late
    expect(isDue({ ...base, now: new Date("2026-10-25T08:00:00Z"), lastRunAt: null })).toBe(false);
    expect(isDue({ ...base, graceMinutes: 400, now: new Date("2026-10-25T08:00:00Z"), lastRunAt: null })).toBe(true);
  });
  it("invalid time is never due", () => {
    expect(isDue({ timeOfDay: "8:00", timeZone: TZ, now: new Date("2026-10-25T02:30:00Z"), lastRunAt: null })).toBe(false);
  });
});

describe("reportRange", () => {
  const now = new Date("2026-10-25T02:30:00Z");
  it("last N days including today", () => {
    expect(reportRange(7, now, TZ)).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(reportRange(1, now, TZ)).toEqual({ from: "2026-10-25", to: "2026-10-25" });
  });
  it("crosses month boundary", () => {
    expect(reportRange(30, now, TZ)).toEqual({ from: "2026-09-26", to: "2026-10-25" });
  });
  it("no range when null or 0", () => {
    expect(reportRange(null, now, TZ)).toEqual({});
    expect(reportRange(0, now, TZ)).toEqual({});
  });
});