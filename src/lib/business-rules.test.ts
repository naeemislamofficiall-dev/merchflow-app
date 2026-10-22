import { beforeEach, describe, expect, it, vi } from "vitest";

// business-rules.ts top-e prisma import kore; DB chhara test korte mock kora holo
const { findPoLine, findOrder } = vi.hoisted(() => ({
  findPoLine: vi.fn(),
  findOrder: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseOrderLine: { findUnique: findPoLine },
    order: { findUnique: findOrder },
  },
}));

import {
  BusinessRuleError,
  assertOrderEditable,
  assertReceiptWithinOrder,
  assertRejectionReason,
} from "./business-rules";

beforeEach(() => {
  findPoLine.mockReset();
  findOrder.mockReset();
});

describe("rule 2: rejection needs a reason", () => {
  it("throws BusinessRuleError for empty / short reason", () => {
    for (const bad of [undefined, null, "", "  ", " ab "]) {
      expect(() => assertRejectionReason(bad)).toThrow(BusinessRuleError);
    }
    expect(() => assertRejectionReason("")).toThrow("Rejection reason is required");
  });

  it("accepts a real reason", () => {
    expect(() => assertRejectionReason("Price too high")).not.toThrow();
  });
});

describe("rule 3: received qty cannot exceed ordered qty", () => {
  it("allows receiving up to the ordered quantity", async () => {
    findPoLine.mockResolvedValue({ quantity: 100, receivedQty: 80 });
    await expect(assertReceiptWithinOrder("l1", 20)).resolves.toBeTruthy();
  });

  it("blocks over-receipt", async () => {
    findPoLine.mockResolvedValue({ quantity: 100, receivedQty: 80 });
    await expect(assertReceiptWithinOrder("l1", 21)).rejects.toThrow(
      "Received quantity cannot exceed ordered quantity"
    );
  });

  it("allows over-receipt only with the exception flag", async () => {
    findPoLine.mockResolvedValue({ quantity: 100, receivedQty: 80 });
    await expect(assertReceiptWithinOrder("l1", 50, true)).resolves.toBeTruthy();
  });

  it("throws when the PO line is missing", async () => {
    findPoLine.mockResolvedValue(null);
    await expect(assertReceiptWithinOrder("x", 1)).rejects.toThrow("PO line not found");
  });
});

describe("rule 9: closed order is not editable", () => {
  it("blocks CLOSED and CANCELLED", async () => {
    for (const status of ["CLOSED", "CANCELLED"]) {
      findOrder.mockResolvedValue({ id: "o1", status });
      await expect(assertOrderEditable("o1")).rejects.toThrow(
        "Closed order can only change through an amendment"
      );
    }
  });

  it("allows CONFIRMED", async () => {
    findOrder.mockResolvedValue({ id: "o1", status: "CONFIRMED" });
    await expect(assertOrderEditable("o1")).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  it("throws when order not found", async () => {
    findOrder.mockResolvedValue(null);
    await expect(assertOrderEditable("o1")).rejects.toThrow("Order not found");
  });
});
