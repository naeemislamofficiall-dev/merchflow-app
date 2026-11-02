import { describe, expect, it } from "vitest";
import { dhu, pareto } from "./dhu";

describe("dhu", () => {
  it("is defects per hundred pieces", () => expect(dhu(6, 200)).toBe(3));
  it("is 0 when nothing inspected", () => expect(dhu(5, 0)).toBe(0));
});

describe("pareto", () => {
  it("sorts descending and accumulates to 100", () => {
    const r = pareto([{ id: "a", qty: 2 }, { id: "b", qty: 6 }, { id: "c", qty: 2 }, { id: "z", qty: 0 }]);
    expect(r.map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(r[0].pct).toBe(60);
    expect(r[2].cumPct).toBeCloseTo(100);
  });
});
