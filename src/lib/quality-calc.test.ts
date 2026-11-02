import { describe, expect, it } from "vitest";
import { defectBalance, reworkExceedsBalance, reworkPct, reworkWipEffect } from "./quality-calc";

describe("rework percentage", () => {
  it("rework / checked x 100, one decimal", () => {
    expect(reworkPct(12, 400)).toBe(3);
    expect(reworkPct(7, 300)).toBe(2.3);
  });
  it("is null when nothing was checked", () => {
    expect(reworkPct(5, 0)).toBeNull();
  });
});

describe("defect balance", () => {
  it("reduces by repaired and rejected quantity", () => {
    expect(
      defectBalance(20, [
        { repairedQty: 8, rejectedQty: 2 },
        { repairedQty: 5, rejectedQty: 0 },
      ])
    ).toBe(5);
  });
  it("never goes below 0", () => {
    expect(defectBalance(5, [{ repairedQty: 9, rejectedQty: 0 }])).toBe(0);
  });
  it("is the full quantity when there is no rework", () => {
    expect(defectBalance(20, [])).toBe(20);
  });
});

describe("rework over balance", () => {
  it("detects an entry bigger than the remaining balance", () => {
    const prev = [{ repairedQty: 15, rejectedQty: 0 }];
    expect(reworkExceedsBalance(20, prev, { repairedQty: 3, rejectedQty: 2 })).toBe(false);
    expect(reworkExceedsBalance(20, prev, { repairedQty: 4, rejectedQty: 2 })).toBe(true);
  });
});

describe("WIP effect", () => {
  it("repaired goes back to WIP, rejected leaves WIP", () => {
    expect(
      reworkWipEffect([
        { repairedQty: 8, rejectedQty: 2 },
        { repairedQty: 5, rejectedQty: 1 },
      ])
    ).toEqual({ returnedToWip: 13, removedFromWip: 3 });
  });
});