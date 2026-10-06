import { auth } from "@/lib/auth";

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

// লগইন করা ইউজার না থাকলে ৪০১ এরর দেয়
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new AuthError("Login required", 401);
  return session.user as unknown as SessionUser;
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