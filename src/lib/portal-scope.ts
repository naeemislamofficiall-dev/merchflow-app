// Portal user-er identity ar tenant boundary. Pure: auth/DB import nai, tai Vitest-e sorasori test hoy.
// supplierId/buyerId SOBSOMOY session theke ashbe, kokhono request parameter theke na.

export type PortalType = "SUPPLIER" | "BUYER";

export type PortalSessionLike = {
  id: string;
  email: string;
  companyId: string;
  portalType?: PortalType | null;
  supplierId?: string | null;
  buyerId?: string | null;
};

export type SupplierPortalContext = {
  type: "SUPPLIER";
  userId: string;
  email: string;
  companyId: string;
  supplierId: string;
};

export type BuyerPortalContext = {
  type: "BUYER";
  userId: string;
  email: string;
  companyId: string;
  buyerId: string;
};

export type PortalContext = SupplierPortalContext | BuyerPortalContext;

export type PortalErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND";

// Message fixed: forbidden ar missing alada kore bola jabe na (existence leak bondho)
const MESSAGES: Record<PortalErrorCode, string> = {
  UNAUTHENTICATED: "Login required",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Not found",
};

export class PortalAccessError extends Error {
  constructor(public code: PortalErrorCode) {
    super(MESSAGES[code]);
    this.name = "PortalAccessError";
  }
  get status(): 401 | 403 | 404 {
    return this.code === "UNAUTHENTICATED" ? 401 : this.code === "FORBIDDEN" ? 403 : 404;
  }
}

export function isPortalSession(user: { portalType?: PortalType | null } | null | undefined): boolean {
  return !!user?.portalType;
}

function present(v: string | null | undefined): v is string {
  return typeof v === "string" && v.length > 0;
}

export function resolvePortalContext(user: PortalSessionLike | null | undefined, expected: "SUPPLIER"): SupplierPortalContext;
export function resolvePortalContext(user: PortalSessionLike | null | undefined, expected: "BUYER"): BuyerPortalContext;
export function resolvePortalContext(user: PortalSessionLike | null | undefined, expected: PortalType): PortalContext {
  if (!user) throw new PortalAccessError("UNAUTHENTICATED");
  if (user.portalType !== expected) throw new PortalAccessError("FORBIDDEN");
  if (!present(user.companyId)) throw new PortalAccessError("FORBIDDEN");

  if (expected === "SUPPLIER") {
    // supplierId lagbe, ar buyerId thakle data bhanga, tai block
    if (!present(user.supplierId) || present(user.buyerId)) throw new PortalAccessError("FORBIDDEN");
    return { type: "SUPPLIER", userId: user.id, email: user.email, companyId: user.companyId, supplierId: user.supplierId };
  }
  if (!present(user.buyerId) || present(user.supplierId)) throw new PortalAccessError("FORBIDDEN");
  return { type: "BUYER", userId: user.id, email: user.email, companyId: user.companyId, buyerId: user.buyerId };
}

// Record onno party-r hole ba na thakle ek-i error: "Not found"
export function assertOwnedBy(expectedPartyId: string, actualPartyId: string | null | undefined): void {
  if (!present(expectedPartyId) || actualPartyId !== expectedPartyId) {
    throw new PortalAccessError("NOT_FOUND");
  }
}

// Service-e: const po = ownedOrNotFound(await prisma...findUnique(...), (r) => r.supplierId, ctx.supplierId)
export function ownedOrNotFound<T>(
  record: T | null | undefined,
  getPartyId: (r: T) => string | null | undefined,
  expectedPartyId: string,
): T {
  if (record === null || record === undefined) throw new PortalAccessError("NOT_FOUND");
  assertOwnedBy(expectedPartyId, getPartyId(record));
  return record;
}