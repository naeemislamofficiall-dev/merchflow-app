import { auth } from "@/lib/auth";
import { getActiveContext } from "@/services/context.service";

export type SessionUser = {
  id: string;
  email: string;
  companyId: string;
  roleId: string;
  permissions: string[];
};

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new AuthError("Login required", 401);
  const base = session.user as unknown as SessionUser;
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