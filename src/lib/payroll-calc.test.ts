import { describe, expect, it } from "vitest";
import { calcPayroll, overlapDays } from "./payroll-calc";

describe("calcPayroll", () => {
  it("no absence, no OT = basic", () => {
    expect(calcPayroll({ basic: 12000, daysInMonth: 30, absentDays: 0, unpaidLeaveDays: 0, overtimeHours: 0 }).net).toBe(12000);
  });
  it("deducts per absent day", () => {
    const r = calcPayroll({ basic: 12000, daysInMonth: 30, absentDays: 2, unpaidLeaveDays: 1, overtimeHours: 0 });
    expect(r.deduction).toBe(1200);
    expect(r.net).toBe(10800);
  });
  it("overtime at 2x hourly basic (basic/208)", () => {
    const r = calcPayroll({ basic: 20800, daysInMonth: 30, absentDays: 0, unpaidLeaveDays: 0, overtimeHours: 10 });
    expect(r.overtimePay).toBe(2000); // 20800/208 = 100/hr, x2 x10h
    expect(r.net).toBe(22800);
  });
  it("net never goes below zero from deduction", () => {
    expect(calcPayroll({ basic: 3000, daysInMonth: 30, absentDays: 40, unpaidLeaveDays: 0, overtimeHours: 0 }).net).toBe(0);
  });
});

describe("overlapDays", () => {
  const ms = new Date("2026-10-01"), me = new Date("2026-10-31");
  it("fully inside", () => expect(overlapDays(new Date("2026-10-05"), new Date("2026-10-07"), ms, me)).toBe(3));
  it("crossing month start", () => expect(overlapDays(new Date("2026-09-29"), new Date("2026-10-02"), ms, me)).toBe(2));
  it("outside", () => expect(overlapDays(new Date("2026-11-02"), new Date("2026-11-03"), ms, me)).toBe(0));
});
