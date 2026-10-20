import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { ALL_PERMISSION_KEYS } from "@/lib/permission-keys";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const roleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional(),
  permissionKeys: z.array(z.string()).max(500),
});

class RoleService extends BaseService {
  private async loadWithKeys(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new BusinessRuleError("Role not found");
    return { role, keys: role.permissions.map((rp) => rp.permission.key) };
  }

  private validateKeys(actor: SessionUser, keys: string[], existing: string[] = []) {
    const unique = [...new Set(keys)];
    const bad = unique.filter((k) => !ALL_PERMISSION_KEYS.includes(k));
    if (bad.length) throw new BusinessRuleError(`Unknown permission: ${bad[0]}`);
    // নিজের যা নেই তা অন্য role-এ দেওয়া যাবে না (admin '*' হলে সব চলবে)
    if (!actor.permissions.includes("*")) {
      const over = unique.filter((k) => !actor.permissions.includes(k) && !existing.includes(k));
      if (over.length) throw new BusinessRuleError(`You cannot grant a permission you do not have: ${over[0]}`);
    }
    return unique;
  }

  private async writePermissions(roleId: string, keys: string[]) {
    await prisma.$transaction(async (tx) => {
      const perms = [];
      for (const key of keys) {
        perms.push(await tx.permission.upsert({ where: { key }, update: {}, create: { key, label: key } }));
      }
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (perms.length) {
        await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId, permissionId: p.id })) });
      }
    });
  }

  async list() {
    await this.guard("role.view");
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });
    return roles.map((r) => {
      const keys = r.permissions.map((rp) => rp.permission.key);
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        users: r._count.users,
        permissionCount: keys.length,
        isAdmin: keys.includes("*"),
      };
    });
  }

  async get(id: string) {
    await this.guard("role.view");
    const { role, keys } = await this.loadWithKeys(id);
    return { id: role.id, name: role.name, description: role.description ?? "", keys, isAdmin: keys.includes("*") };
  }

  async create(input: unknown) {
    const user = await this.guard("role.manage");
    const data = roleSchema.parse(input);
    const keys = this.validateKeys(user, data.permissionKeys);
    const dup = await prisma.role.findUnique({ where: { name: data.name } });
    if (dup) throw new BusinessRuleError("A role with this name already exists");
    const row = await prisma.role.create({ data: { name: data.name, description: data.description } });
    await this.writePermissions(row.id, keys);
    await this.audit({
      user, action: "CREATE", entity: "Role", entityId: row.id,
      after: { name: row.name, description: row.description, permissions: keys },
    });
    return { id: row.id };
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("role.manage");
    const { role, keys: beforeKeys } = await this.loadWithKeys(id);
    if (beforeKeys.includes("*")) throw new BusinessRuleError("The admin role cannot be edited");
    if (role.id === user.roleId) throw new BusinessRuleError("You cannot edit your own role");
    const data = roleSchema.parse(input);
    const keys = this.validateKeys(user, data.permissionKeys, beforeKeys);
    if (data.name !== role.name) {
      const dup = await prisma.role.findUnique({ where: { name: data.name } });
      if (dup) throw new BusinessRuleError("A role with this name already exists");
    }
    await prisma.role.update({ where: { id }, data: { name: data.name, description: data.description ?? null } });
    await this.writePermissions(id, keys);
    await this.audit({
      user, action: "UPDATE", entity: "Role", entityId: id,
      before: { name: role.name, permissions: beforeKeys },
      after: { name: data.name, permissions: keys },
    });
    return { id };
  }
}

export const roleService = new RoleService();
