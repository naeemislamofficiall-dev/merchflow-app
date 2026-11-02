// REST route handler wrapper: session auth + portal context + rate limit + error mapping.
// Route file-e: export const GET = supplierApi(async (ctx) => service.list(ctx));
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { BusinessRuleError } from "@/lib/business-rules";
import {
  PortalAccessError,
  resolvePortalContext,
  type BuyerPortalContext,
  type SupplierPortalContext,
} from "@/lib/portal-scope";
import { InMemoryRateLimiter, checkRateLimits, clientIp, rateLimitKeys } from "@/lib/rate-limit";

// LIMITATION: in-memory, multi-instance-e shared na (details rate-limit.ts)
const limiter = new InMemoryRateLimiter(120, 60_000);

type RouteCtx = { params: Promise<Record<string, string>> };

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

function toErrorResponse(e: unknown) {
  if (e instanceof PortalAccessError) return json({ error: e.message }, e.status);
  if (e instanceof BusinessRuleError) return json({ error: e.message }, 422);
  if (e instanceof ZodError) return json({ error: "Invalid input" }, 400);
  console.error("portal api error", e);
  return json({ error: "Server error" }, 500);
}

async function run<C>(
  expected: "SUPPLIER" | "BUYER",
  req: Request,
  routeCtx: RouteCtx,
  handler: (ctx: C, req: Request, params: Record<string, string>) => Promise<unknown>,
) {
  try {
    const session = await auth();
    const user = session?.user ? { ...session.user, email: session.user.email ?? "" } : null;
    const ctx = (expected === "SUPPLIER"
      ? resolvePortalContext(user, "SUPPLIER")
      : resolvePortalContext(user, "BUYER")) as unknown as C;

    const rl = checkRateLimits(limiter, rateLimitKeys(user?.id, clientIp(req.headers)));
    if (!rl.allowed) {
      return json({ error: "Too many requests" }, 429, { "Retry-After": String(rl.retryAfterSec) });
    }

    const params = await routeCtx.params;
    const data = await handler(ctx, req, params ?? {});
    return json({ ok: true, data });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export function supplierApi(
  handler: (ctx: SupplierPortalContext, req: Request, params: Record<string, string>) => Promise<unknown>,
) {
  return (req: Request, routeCtx: RouteCtx) => run<SupplierPortalContext>("SUPPLIER", req, routeCtx, handler);
}

export function buyerApi(
  handler: (ctx: BuyerPortalContext, req: Request, params: Record<string, string>) => Promise<unknown>,
) {
  return (req: Request, routeCtx: RouteCtx) => run<BuyerPortalContext>("BUYER", req, routeCtx, handler);
}