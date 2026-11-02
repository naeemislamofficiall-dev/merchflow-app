import { describe, expect, it } from "vitest";
import {
  PortalAccessError,
  assertOwnedBy,
  isPortalSession,
  ownedOrNotFound,
  resolvePortalContext,
  type PortalSessionLike,
} from "./portal-scope";

const supplierA: PortalSessionLike = { id: "uA", email: "a@sup.com", companyId: "c1", portalType: "SUPPLIER", supplierId: "supA" };
const buyerA: PortalSessionLike = { id: "uB", email: "a@buy.com", companyId: "c1", portalType: "BUYER", buyerId: "buyA" };
const internal: PortalSessionLike = { id: "uI", email: "i@co.com", companyId: "c1" };

function failure(fn: () => unknown): { code: string; message: string } | null {
  try {
    fn();
  } catch (e) {
    if (e instanceof PortalAccessError) return { code: e.code, message: e.message };
    throw e;
  }
  return null;
}

describe("resolvePortalContext", () => {
  it("supplier id session theke ashe", () => {
    const ctx = resolvePortalContext(supplierA, "SUPPLIER");
    expect(ctx.supplierId).toBe("supA");
    expect(ctx.userId).toBe("uA");
  });

  it("buyer id session theke ashe", () => {
    expect(resolvePortalContext(buyerA, "BUYER").buyerId).toBe("buyA");
  });

  it("login chhara UNAUTHENTICATED", () => {
    expect(failure(() => resolvePortalContext(null, "SUPPLIER"))?.code).toBe("UNAUTHENTICATED");
  });

  it("internal user portal context pabe na", () => {
    expect(failure(() => resolvePortalContext(internal, "SUPPLIER"))?.code).toBe("FORBIDDEN");
    expect(failure(() => resolvePortalContext(internal, "BUYER"))?.code).toBe("FORBIDDEN");
  });

  it("supplier user buyer portal-e dhukte parbe na, ulta-o na", () => {
    expect(failure(() => resolvePortalContext(supplierA, "BUYER"))?.code).toBe("FORBIDDEN");
    expect(failure(() => resolvePortalContext(buyerA, "SUPPLIER"))?.code).toBe("FORBIDDEN");
  });

  it("supplierId na thakle ba duita id thakle FORBIDDEN", () => {
    expect(failure(() => resolvePortalContext({ ...supplierA, supplierId: null }, "SUPPLIER"))?.code).toBe("FORBIDDEN");
    expect(failure(() => resolvePortalContext({ ...supplierA, buyerId: "buyA" }, "SUPPLIER"))?.code).toBe("FORBIDDEN");
    expect(failure(() => resolvePortalContext({ ...buyerA, buyerId: "" }, "BUYER"))?.code).toBe("FORBIDDEN");
  });

  it("companyId khali hole FORBIDDEN", () => {
    expect(failure(() => resolvePortalContext({ ...supplierA, companyId: "" }, "SUPPLIER"))?.code).toBe("FORBIDDEN");
  });
});

describe("cross-tenant (IDOR) protection", () => {
  const poOfA = { id: "po1", supplierId: "supA" };
  const poOfB = { id: "po2", supplierId: "supB" };
  const orderOfA = { id: "o1", buyerId: "buyA" };
  const orderOfB = { id: "o2", buyerId: "buyB" };

  it("supplier A nijer PO pay", () => {
    const ctx = resolvePortalContext(supplierA, "SUPPLIER");
    expect(ownedOrNotFound(poOfA, (r) => r.supplierId, ctx.supplierId)).toBe(poOfA);
  });

  it("supplier A, supplier B-r PO khulte parbe na", () => {
    const ctx = resolvePortalContext(supplierA, "SUPPLIER");
    expect(failure(() => ownedOrNotFound(poOfB, (r) => r.supplierId, ctx.supplierId))?.code).toBe("NOT_FOUND");
  });

  it("buyer A, buyer B-r order dekhbe na", () => {
    const ctx = resolvePortalContext(buyerA, "BUYER");
    expect(ownedOrNotFound(orderOfA, (r) => r.buyerId, ctx.buyerId)).toBe(orderOfA);
    expect(failure(() => ownedOrNotFound(orderOfB, (r) => r.buyerId, ctx.buyerId))?.code).toBe("NOT_FOUND");
  });

  it("onno party-r record ar asol-e nai emon record-er error ek-i (leak nai)", () => {
    const ctx = resolvePortalContext(supplierA, "SUPPLIER");
    const other = failure(() => ownedOrNotFound(poOfB, (r) => r.supplierId, ctx.supplierId));
    const missing = failure(() => ownedOrNotFound(null, (r: typeof poOfB) => r.supplierId, ctx.supplierId));
    expect(other).toEqual(missing);
    expect(other?.message).toBe("Not found");
  });

  it("assertOwnedBy: null ba khali id-o NOT_FOUND", () => {
    expect(failure(() => assertOwnedBy("supA", null))?.code).toBe("NOT_FOUND");
    expect(failure(() => assertOwnedBy("", ""))?.code).toBe("NOT_FOUND");
    expect(failure(() => assertOwnedBy("supA", "supA"))).toBeNull();
  });
});

describe("isPortalSession", () => {
  it("portalType thakle true", () => {
    expect(isPortalSession(supplierA)).toBe(true);
    expect(isPortalSession(internal)).toBe(false);
    expect(isPortalSession(null)).toBe(false);
  });
});