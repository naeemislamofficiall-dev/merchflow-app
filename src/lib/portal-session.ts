// Portal service-gulor entry point: session theke portal context ber kore.
// supplierId/buyerId kokhono request parameter theke na, shudhu session theke.
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";
import {
  resolvePortalContext,
  type BuyerPortalContext,
  type PortalContext,
  type PortalSessionLike,
  type SupplierPortalContext,
} from "@/lib/portal-scope";

async function sessionLike(): Promise<PortalSessionLike | null> {
  const session = await auth();
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    companyId: u.companyId,
    portalType: u.portalType ?? null,
    supplierId: u.supplierId ?? null,
    buyerId: u.buyerId ?? null,
  };
}

export async function requireSupplierPortal(): Promise<SupplierPortalContext> {
  return resolvePortalContext(await sessionLike(), "SUPPLIER");
}

export async function requireBuyerPortal(): Promise<BuyerPortalContext> {
  return resolvePortalContext(await sessionLike(), "BUYER");
}

// writeAudit SessionUser chay. Portal user-er id/email audit-e jabe, permission khali.
export function portalAuditUser(ctx: PortalContext): SessionUser {
  return { id: ctx.userId, email: ctx.email, companyId: ctx.companyId, roleId: "", permissions: [] };
}

// Audit-er before/after-e portal identity (AuditLog-e alada column nai, tai payload-e)
export function portalIdentity(ctx: PortalContext) {
  return ctx.type === "SUPPLIER"
    ? { via: "PORTAL", portalType: "SUPPLIER", portalUserEmail: ctx.email, supplierId: ctx.supplierId }
    : { via: "PORTAL", portalType: "BUYER", portalUserEmail: ctx.email, buyerId: ctx.buyerId };
}