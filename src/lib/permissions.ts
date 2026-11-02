import { auth } from "@/lib/auth";
import { getActiveContext } from "@/services/context.service";
import { AsyncLocalStorage } from "node:async_hooks";

export type SessionUser = {
  id: string;
  email: string;
  companyId: string;
  roleId: string;
  permissions: string[];
  portalType?: "SUPPLIER" | "BUYER";
  supplierId?: string;
  buyerId?: string;
};

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

const asUser = new AsyncLocalStorage<SessionUser>();

// Background job-er jonno: fn-er bhitore requireUser() ei user dey. Request-er baire kono effect nai.
export function runAsUser<T>(user: SessionUser, fn: () => Promise<T>): Promise<T> {
  return asUser.run(user, fn);
}

export async function requireUser(): Promise<SessionUser> {
  const injected = asUser.getStore();
  if (injected) return injected;
  const session = await auth();
  if (!session?.user) throw new AuthError("Login required", 401);
  const base = session.user as unknown as SessionUser;
    // Portal user kono internal service/page-e dhukte parbe na (portal service alada helper use kore)
  if (base.portalType) throw new AuthError("Access denied", 403);
  // "কোন কোম্পানিতে কাজ করছি" ড্রপডাউনের পছন্দ (cookie) সব সার্ভিসে এখান থেকে প্রয়োগ হয়
  const ctx = await getActiveContext(base.id);
  return { ...base, companyId: ctx.companyId ?? base.companyId };
}

export function can(user: SessionUser, code: string): boolean {
  return user.permissions.includes("*") || user.permissions.includes(code);
}

// permission না থাকলে ৪০৩ এরর দেয়
export async function requirePermission(code: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, code)) throw new AuthError(`Missing permission: ${code}`, 403);
  return user;
}