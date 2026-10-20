"use server";

import { runAction } from "@/lib/action-result";
import { roleService } from "@/services/role.service";

type RoleValues = { name: string; description: string; permissionKeys: string[] };

function clean(v: RoleValues) {
  return { name: v.name, description: v.description || undefined, permissionKeys: v.permissionKeys };
}

export async function createRoleAction(values: RoleValues) {
  return runAction(() => roleService.create(clean(values)));
}

export async function updateRoleAction(id: string, values: RoleValues) {
  return runAction(() => roleService.update(id, clean(values)));
}
