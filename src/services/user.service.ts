import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { createResetToken } from "@/lib/reset-token";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Password needs a letter")
  .regex(/\d/, "Password needs a number");

const scopes = ["COMPANY", "FACTORY"] as const;

const baseFields = {
  name: z.string().trim().min(1).max(120),
  roleId: z.string().min(1),
  scope: z.enum(scopes),
  factoryId: z.string().optional(),
};

const createSchema = z.object({
  ...baseFields,
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
});

const updateSchema = z.object({
  ...baseFields,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

// ইউজারের যেসব তথ্য audit-এ যাবে (passwordHash কখনও না)
function safe(u: { id: string; email: string; name: string; roleId: string; scope: string; factoryId: string | null; status: string }) {
  return { id: u.id, email: u.email, name: u.name, roleId: u.roleId, scope: u.scope, factoryId: u.factoryId, status: u.status };
}

class UserService extends BaseService {
  // নিজের যে permission নেই সেটা অন্যকে দেওয়া যাবে না (privilege escalation আটকাতে)
  private async assertCanGrantRole(actor: SessionUser, roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new BusinessRuleError("Role not found");
    if (actor.permissions.includes("*")) return role;
    const keys = role.permissions.map((rp) => rp.permission.key);
    const missing = keys.filter((k) => k === "*" || !actor.permissions.includes(k));
    if (missing.length) {
      throw new BusinessRuleError("You cannot assign a role with more access than you have");
    }
    return role;
  }

  private async assertFactory(companyId: string, scope: string, factoryId?: string) {
    if (scope !== "FACTORY") return undefined;
    if (!factoryId) throw new BusinessRuleError("Select a factory for factory-level access");
    const f = await prisma.factory.findFirst({ where: { id: factoryId, companyId } });
    if (!f) throw new BusinessRuleError("Factory not found");
    return f.id;
  }

  private async load(user: SessionUser, id: string) {
    const row = await prisma.user.findUnique({ where: { id } });
    if (!row || row.companyId !== user.companyId) throw new BusinessRuleError("User not found");
    return row;
  }

  async list() {
    const user = await this.guard("user.view");
    return prisma.user.findMany({
      where: { companyId: user.companyId },
      include: { role: { select: { name: true } }, factory: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("user.view");
    await this.load(user, id);
    return prisma.user.findUnique({
      where: { id },
      include: { role: { select: { name: true } } },
    });
  }

  async options() {
    const user = await this.guard("user.view");
    const [roles, factories] = await Promise.all([
      prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.factory.findMany({
        where: { companyId: user.companyId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    return { roles, factories };
  }

  async create(input: unknown) {
    const user = await this.guard("user.create");
    const data = createSchema.parse(input);
    await this.assertCanGrantRole(user, data.roleId);
    const factoryId = await this.assertFactory(user.companyId, data.scope, data.factoryId);
    const dup = await prisma.user.findUnique({ where: { email: data.email } });
    if (dup) throw new BusinessRuleError("A user with this email already exists");

    const row = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await bcrypt.hash(data.password, 10),
        roleId: data.roleId,
        scope: data.scope,
        companyId: user.companyId,
        factoryId: factoryId ?? null,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "User", entityId: row.id, after: safe(row) });
    return { id: row.id };
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("user.edit");
    const before = await this.load(user, id);
    const data = updateSchema.parse(input);

    if (before.id === user.id) {
      if (data.status !== "ACTIVE") throw new BusinessRuleError("You cannot deactivate your own account");
      if (data.roleId !== before.roleId) throw new BusinessRuleError("You cannot change your own role");
    }
    if (data.roleId !== before.roleId) await this.assertCanGrantRole(user, data.roleId);
    const factoryId = await this.assertFactory(user.companyId, data.scope, data.factoryId);

    const row = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        roleId: data.roleId,
        status: data.status,
        scope: data.scope,
        factoryId: factoryId ?? null,
      },
    });
    await this.audit({ user, action: "UPDATE", entity: "User", entityId: id, before: safe(before), after: safe(row) });
    return { id };
  }

  async resetPassword(id: string, password: unknown) {
    const user = await this.guard("user.edit");
    const target = await this.load(user, id);
    const pw = passwordSchema.parse(password);
    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
    await this.audit({
      user,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      after: { email: target.email },
      reason: "Password reset by admin",
    });
    return { id };
  }

  // admin একবার-ব্যবহারযোগ্য রিসেট লিংক বানায় (১ ঘণ্টা চলে), নিজে ইউজারকে পাঠায়
  async createResetLink(id: string) {
    const user = await this.guard("user.edit");
    const target = await this.load(user, id);
    if (target.status !== "ACTIVE") throw new BusinessRuleError("Activate the user first");
    const token = createResetToken(target);
    await this.audit({
      user,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      after: { email: target.email },
      reason: "Password reset link issued",
    });
    return { path: `/reset-password?token=${encodeURIComponent(token)}` };
  }
}

export const userService = new UserService();
