"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { leaveService } from "@/services/leave.service";

export async function createLeaveAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await leaveService.create(dropEmpty(values));
    return { id: r.id };
  });
}
export async function approveLeaveAction(id: string) {
  return runAction(async () => leaveService.approve(id));
}
export async function rejectLeaveAction(id: string, reason?: string) {
  return runAction(async () => leaveService.reject(id, reason ?? ""));
}
export async function cancelLeaveAction(id: string) {
  return runAction(async () => leaveService.cancel(id));
}
