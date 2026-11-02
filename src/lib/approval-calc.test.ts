import { describe, expect, it } from "vitest";
import { daysPending, delegationCovers, shouldEscalate } from "./approval-calc";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("delegation date range", () => {
  const del = { startDate: d("2026-11-01"), endDate: d("2026-11-05"), isActive: true };
  it("includes both end dates", () => {
    expect(delegationCovers(del, d("2026-11-01"))).toBe(true);
    expect(delegationCovers(del, d("2026-11-05"))).toBe(true);
  });
  it("excludes days outside the range", () => {
    expect(delegationCovers(del, d("2026-10-31"))).toBe(false);
    expect(delegationCovers(del, d("2026-11-06"))).toBe(false);
  });
  it("revoked delegation never covers", () => {
    expect(delegationCovers({ ...del, isActive: false }, d("2026-11-02"))).toBe(false);
  });
});

describe("escalation", () => {
  it("counts whole days pending", () => {
    expect(daysPending(d("2026-11-01"), d("2026-11-04"))).toBe(3);
  });
  it("fires only when pending is more than N days", () => {
    expect(shouldEscalate(d("2026-11-01"), d("2026-11-03"), 2, false)).toBe(false);
    expect(shouldEscalate(d("2026-11-01"), d("2026-11-04"), 2, false)).toBe(true);
  });
  it("does not fire twice, or when the rule is off", () => {
    expect(shouldEscalate(d("2026-11-01"), d("2026-11-10"), 2, true)).toBe(false);
    expect(shouldEscalate(d("2026-11-01"), d("2026-11-10"), null, false)).toBe(false);
  });
});