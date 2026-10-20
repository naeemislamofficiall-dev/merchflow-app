"use server";

import { runAction } from "@/lib/action-result";
import { userService } from "@/services/user.service";

export async function createUserAction(values: Record<string, string>) {
  return runAction(() => userService.create(values));
}

export async function updateUserAction(id: string, values: Record<string, string>) {
  return runAction(() => userService.update(id, values));
}

export async function resetPasswordAction(id: string, password: string) {
  return runAction(() => userService.resetPassword(id, password));
}

export async function createResetLinkAction(id: string) {
  return runAction(() => userService.createResetLink(id));
}
