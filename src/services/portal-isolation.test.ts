import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  supplierCtx: { type: "SUPPLIER" as const, userId: "uA", email: "a@sup.com", companyId: "c1", supplierId: "supA" },
  buyerCtx: { type: "BUYER" as const, userId: "uB", email: "a@buy.com", companyId: "c1", buyerId: "buyA" },
  poFindFirst: vi.fn(),
  poFindMany: vi.fn(),
  orderFindFirst: vi.fn(),
  sampleFindFirst: vi.fn(),
  tx: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseOrder: { findFirst: h.poFindFirst, findMany: h.poFindMany },
    order: { findFirst: h.orderFindFirst },
    sampleRequest: { findFirst: h.sampleFindFirst },
    sampleApproval: { count: vi.fn() },
    $transaction: h.tx,
  },
}));
vi.mock("@/lib/audit", () => ({ writeAudit: h.audit }));
vi.mock("@/lib/service-helpers", () => ({ assertApprovalAllows: vi.fn() }));
vi.mock("@/lib/portal-session", () => ({
  requireSupplierPortal: async () => h.supplierCtx,
  requireBuyerPortal: async () => h.buyerCtx,
  portalAuditUser: () => ({ id: "x", email: "x", companyId: "c1", roleId: "", permissions: [] }),
  portalIdentity: () => ({ via: "PORTAL" }),
}));

import { portalSupplierService } from "./portal-supplier.service";
import { portalBuyerService } from "./portal-buyer.service";

type PoWhere = { id?: string; supplierId?: string; companyId?: string };
type OrderWhere = { id?: string; buyerId?: string; companyId?: string };
type SampleWhere = { id?: string; companyId?: string; style?: { buyerId?: string } };

const POS = [
  { id: "po1", supplierId: "supA", companyId: "c1", status: "SENT" },
  { id: "po2", supplierId: "supB", companyId: "c1", status: "SENT" },
];
const ORDERS = [
  { id: "o1", buyerId: "buyA", companyId: "c1" },
  { id: "o2", buyerId: "buyB", companyId: "c1" },
];
const SAMPLES = [
  { id: "s1", buyerId: "buyA", companyId: "c1", status: "BUYER_REVIEW" },
  { id: "s2", buyerId: "buyB", companyId: "c1", status: "BUYER_REVIEW" },
];

beforeEach(() => {
  vi.clearAllMocks();
  h.poFindFirst.mockImplementation(async ({ where }: { where: PoWhere }) =>
    POS.find((p) => p.id === where.id && p.supplierId === where.supplierId && p.companyId === where.companyId) ?? null,
  );
  h.orderFindFirst.mockImplementation(async ({ where }: { where: OrderWhere }) =>
    ORDERS.find((o) => o.id === where.id && o.buyerId === where.buyerId && o.companyId === where.companyId) ?? null,
  );
  h.sampleFindFirst.mockImplementation(async ({ where }: { where: SampleWhere }) =>
    SAMPLES.find((s) => s.id === where.id && s.buyerId === where.style?.buyerId && s.companyId === where.companyId) ?? null,
  );
});

const NOT_FOUND = { code: "NOT_FOUND", message: "Not found" };

describe("supplier portal isolation", () => {
  it("supplier A nijer PO pay", async () => {
    await expect(portalSupplierService.getPo("po1")).resolves.toMatchObject({ id: "po1" });
  });

  it("supplier A, supplier B-r PO (URL id bodle) khulte parbe na", async () => {
    await expect(portalSupplierService.getPo("po2")).rejects.toMatchObject(NOT_FOUND);
  });

  it("onno supplier-er PO ar asol-e nai emon PO-r error ek-i", async () => {
    const other = await portalSupplierService.getPo("po2").catch((e) => e);
    const missing = await portalSupplierService.getPo("nope").catch((e) => e);
    expect(other.message).toBe(missing.message);
    expect(other.code).toBe(missing.code);
  });

  it("list query-te session-er supplierId filter thake", async () => {
    h.poFindMany.mockResolvedValue([]);
    await portalSupplierService.listPos();
    expect(h.poFindMany.mock.calls[0][0].where.supplierId).toBe("supA");
  });

  it("onno supplier-er PO-te date confirm hoy na, kichu likhe-o na", async () => {
    await expect(
      portalSupplierService.confirmDate({ poId: "po2", confirmedDate: "2099-01-01" }),
    ).rejects.toMatchObject(NOT_FOUND);
    expect(h.tx).not.toHaveBeenCalled();
    expect(h.audit).not.toHaveBeenCalled();
  });
});

describe("buyer portal isolation", () => {
  it("buyer A nijer order pay, buyer B-r order pay na", async () => {
    await expect(portalBuyerService.getOrder("o1")).resolves.toMatchObject({ id: "o1" });
    await expect(portalBuyerService.getOrder("o2")).rejects.toMatchObject(NOT_FOUND);
  });

  it("buyer A onno buyer-er sample approve korte parbe na", async () => {
    await expect(
      portalBuyerService.decideSample({ sampleId: "s2", decision: "APPROVED" }),
    ).rejects.toMatchObject(NOT_FOUND);
    expect(h.tx).not.toHaveBeenCalled();
    expect(h.audit).not.toHaveBeenCalled();
  });

  it("reject-e comment chhara hobe na", async () => {
    await expect(
      portalBuyerService.decideSample({ sampleId: "s1", decision: "REJECTED" }),
    ).rejects.toBeTruthy();
    expect(h.tx).not.toHaveBeenCalled();
  });
});