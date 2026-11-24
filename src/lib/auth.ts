import { loginRatelimit } from "@/lib/ratelimit";
import NextAuth, { type DefaultSession, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isLoginLocked, recordLoginFailure, writeAudit } from "@/lib/audit";

declare module "next-auth" {
  interface User {
    companyId?: string;
    roleId?: string;
    permissions?: string[];
    portalType?: "SUPPLIER" | "BUYER";
    supplierId?: string;
    buyerId?: string;
  }
  interface Session {
    user: {
      id: string;
      companyId: string;
      roleId: string;
      permissions: string[];
      portalType?: "SUPPLIER" | "BUYER";
      supplierId?: string;
      buyerId?: string;
    } & DefaultSession["user"];
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuv";


export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request): Promise<User | null> {
          const ip =
          request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        const { success } = await loginRatelimit.limit(ip);
        if (!success) return null;
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        if (await isLoginLocked(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            portalAccount: true,
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        });
        if (!user || user.status !== "ACTIVE") {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          await recordLoginFailure(email, user?.id).catch(() => undefined);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await recordLoginFailure(email, user.id).catch(() => undefined);
          return null;
        }

        const portal = user.portalAccount;
        // Portal user-er kono internal permission thakbe na
        const permissions = portal ? [] : user.role.permissions.map((rp) => rp.permission.key);

        
        await prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);
        await writeAudit({
          user: {
            id: user.id,
            email: user.email,
            companyId: user.companyId ?? "",
            roleId: user.roleId,
            permissions,
          },
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
        }).catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          portalType: portal?.type,
          supplierId: portal?.supplierId ?? undefined,
          buyerId: portal?.buyerId ?? undefined,
          companyId: user.companyId ?? undefined,
          roleId: user.roleId,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.companyId = user.companyId;
        token.roleId = user.roleId;
        token.permissions = user.permissions;
        token.portalType = user.portalType;
        token.supplierId = user.supplierId;
        token.buyerId = user.buyerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.companyId = String(token.companyId ?? "");
      session.user.roleId = String(token.roleId ?? "");
      session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      session.user.portalType = (token.portalType as "SUPPLIER" | "BUYER" | undefined) ?? undefined;
      session.user.supplierId = (token.supplierId as string | undefined) ?? undefined;
      session.user.buyerId = (token.buyerId as string | undefined) ?? undefined;
      return session;
    },
  },
});