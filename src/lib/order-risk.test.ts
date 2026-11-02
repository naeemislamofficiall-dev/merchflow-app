import { describe, expect, it } from "vitest";
import { scoreOrder, type RiskInput } from "./order-risk";

const base: RiskInput = {
  daysToShip: 60, overdueTna: 0, maxTnaLateDays: 0, latePoLines: 0, maxPoDelayDays: 0,
  producedPct: null, hasProduction: false, finalInspectionFailed: false,
};

describe("scoreOrder", () => {
  it("clean order is LOW with no reasons", () => {
    const r = scoreOrder(base);
    expect(r.level).toBe("LOW");
    expect(r.reasons).toEqual([]);
  });
  it("ships soon with no production is flagged", () => {
    const r = scoreOrder({ ...base, daysToShip: 7 });
    expect(r.score).toBe(30);
    expect(r.level).toBe("MEDIUM");
    expect(r.reasons[0]).toMatch(/no production order/);
  });
  it("late T&A + late PO + low output is HIGH", () => {
    const r = scoreOrder({ ...base, daysToShip: 10, overdueTna: 3, maxTnaLateDays: 6, latePoLines: 2, maxPoDelayDays: 5, hasProduction: true, producedPct: 40 });
    expect(r.level).toBe("HIGH");
    expect(r.reasons.length).toBe(3);
  });
  it("score is capped at 100", () => {
    const r = scoreOrder({ ...base, daysToShip: -3, overdueTna: 20, maxTnaLateDays: 90, latePoLines: 20, maxPoDelayDays: 90, finalInspectionFailed: true });
    expect(r.score).toBe(100);
  });
});
