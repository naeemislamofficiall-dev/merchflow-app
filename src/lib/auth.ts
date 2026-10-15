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
  }
  interface Session {
    user: {
      id: string;
      companyId: string;
      roleId: string;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw): Promise<User | null> {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // অনেকবার ভুল চেষ্টা হলে কিছুক্ষণের জন্য আটকে দেয়
        if (await isLoginLocked(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        });
        if (!user || user.status !== "ACTIVE") {
          await recordLoginFailure(email, user?.id).catch(() => undefined);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          await recordLoginFailure(email, user.id).catch(() => undefined);
          return null;
        }

        const permissions = user.role.permissions.map((rp) => rp.permission.key);

        // লগইন সফল: শেষ লগইনের সময় আর audit লেখা (এটা ব্যর্থ হলেও লগইন আটকাবে না)
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
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.companyId = String(token.companyId ?? "");
      session.user.roleId = String(token.roleId ?? "");
      session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      return session;
    },
  },
});