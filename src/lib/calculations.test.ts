import { describe, expect, it } from "vitest";
import {
  buildTnaTasks,
  costItemAmount,
  costSheetTotals,
  delayAlertMessage,
  delayDays,
  grossRequirement,
  marginFromPrice,
  matrixTotals,
  netRequirement,
  poTotals,
  scoreQuotations,
  supplierScorecard,
} from "./calculations";

describe("costing", () => {
  it("costItemAmount applies wastage then price", () => {
    // 2 × 1.10 × 5 = 11
    expect(costItemAmount({ consumption: 2, unitPrice: 5, wastagePct: 10 })).toBe(11);
  });

  it("costSheetTotals: cost 100 with 20% margin quotes 125", () => {
    const r = costSheetTotals(
      [
        { consumption: 1, unitPrice: 60, wastagePct: 0 },
        { consumption: 2, unitPrice: 20, wastagePct: 0 },
      ],
      20
    );
    expect(r.totalCost).toBe(100);
    expect(r.quotedPrice).toBe(125);
    expect(r.profit).toBe(25);
  });

  it("costSheetTotals rejects margin < 0 or >= 100", () => {
    expect(() => costSheetTotals([], -1)).toThrow("Margin must be");
    expect(() => costSheetTotals([], 100)).toThrow("Margin must be");
  });

  it("marginFromPrice", () => {
    expect(marginFromPrice(100, 125)).toBe(20);
    expect(marginFromPrice(100, 80)).toBe(-25);
    expect(marginFromPrice(100, 0)).toBe(0);
  });
});

describe("BOM / MRP", () => {
  it("grossRequirement = qty × consumption × (1 + wastage)", () => {
    // 20000 × 1.5 × 1.05 = 31500
    expect(grossRequirement({ consumption: 1.5, wastagePct: 5 }, 20000)).toBe(31500);
  });

  it("netRequirement = gross - stock - incoming + reserved", () => {
    expect(netRequirement(31500, 5000, 2000)).toBe(24500);
    expect(netRequirement(31500, 5000, 2000, 1000)).toBe(25500);
    expect(netRequirement(100, 30)).toBe(70);
  });

  it("netRequirement never goes negative", () => {
    expect(netRequirement(100, 500, 50)).toBe(0);
  });
});

describe("T&A", () => {
  it("buildTnaTasks counts back from ship date", () => {
    const ship = new Date(2026, 5, 30); // 30 Jun 2026 (local)
    const [t] = buildTnaTasks(ship, [{ name: "Fabric in-house", daysBefore: 10, sortOrder: 1 }]);
    expect(t.name).toBe("Fabric in-house");
    expect(t.sortOrder).toBe(1);
    expect(t.plannedDate.getMonth()).toBe(5);
    expect(t.plannedDate.getDate()).toBe(20);
    // original date must not be mutated
    expect(ship.getDate()).toBe(30);
  });
});

describe("PO", () => {
  it("poTotals", () => {
    const r = poTotals([
      { quantity: 100, rate: 2.5, taxPct: 10 },
      { quantity: 50, rate: 4, taxPct: 0 },
    ]);
    expect(r).toEqual({ subtotal: 450, tax: 25, grandTotal: 475 });
  });
});

describe("supplier follow-up", () => {
  const promised = new Date("2026-06-01T00:00:00Z");

  it("delayDays floors to whole days", () => {
    expect(delayDays(promised, new Date("2026-06-04T12:00:00Z"))).toBe(3);
  });

  it("delayDays is 0 when not late", () => {
    expect(delayDays(promised, new Date("2026-05-30T00:00:00Z"))).toBe(0);
  });

  it("delayAlertMessage", () => {
    expect(delayAlertMessage("Acme", "Fabric", 3, "ORD-1")).toBe(
      "Acme is 3 days late on Fabric delivery for Order #ORD-1."
    );
  });
});

describe("quotation scoring", () => {
  it("cheaper + faster + good quality ranks first", () => {
    const r = scoreQuotations([
      { id: "B", unitPrice: 20, leadTimeDays: 20, qualityRating: 100 },
      { id: "A", unitPrice: 10, leadTimeDays: 10, qualityRating: 80 },
    ]);
    // A: 100×.5 + 100×.25 + 80×.25 = 95 ; B: 50×.5 + 50×.25 + 100×.25 = 62.5
    expect(r[0]).toEqual({ id: "A", score: 95 });
    expect(r[1]).toEqual({ id: "B", score: 62.5 });
  });
});

describe("supplier scorecard", () => {
  it("computes percentages", () => {
    const r = supplierScorecard({
      deliveriesTotal: 10,
      deliveriesOnTime: 9,
      receivedQty: 1000,
      acceptedQty: 950,
      posTotal: 4,
      posCompleted: 3,
    });
    expect(r).toEqual({
      onTimeDeliveryPct: 90,
      qualityAcceptancePct: 95,
      rejectionPct: 5,
      poCompletionPct: 75,
    });
  });

  it("zero denominators give 0, not NaN", () => {
    const r = supplierScorecard({
      deliveriesTotal: 0,
      deliveriesOnTime: 0,
      receivedQty: 0,
      acceptedQty: 0,
      posTotal: 0,
      posCompleted: 0,
    });
    expect(r.onTimeDeliveryPct).toBe(0);
    expect(r.rejectionPct).toBe(0);
  });
});

describe("color/size matrix", () => {
  it("matrixTotals sums by color, size and overall", () => {
    const r = matrixTotals([
      { colorId: "red", sizeId: "M", quantity: 100 },
      { colorId: "red", sizeId: "L", quantity: 50 },
      { colorId: "blue", sizeId: "M", quantity: 70 },
    ]);
    expect(r.byColor).toEqual({ red: 150, blue: 70 });
    expect(r.bySize).toEqual({ M: 170, L: 50 });
    expect(r.total).toBe(220);
  });
});
