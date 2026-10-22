"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { hrService } from "@/services/hr.service";

export async function createDesignationAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await hrService.createDesignation(dropEmpty(values));
    return { id: r.id };
  });
}
export async function createShiftAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await hrService.createShift(dropEmpty(values));
    return { id: r.id };
  });
}
export async function createLeaveTypeAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await hrService.createLeaveType(dropEmpty(values));
    return { id: r.id };
  });
}
export async function toggleDesignationAction(id: string) {
  return runAction(async () => hrService.toggleMaster("designation", id));
}
export async function toggleShiftAction(id: string) {
  return runAction(async () => hrService.toggleMaster("shift", id));
}
export async function toggleLeaveTypeAction(id: string) {
  return runAction(async () => hrService.toggleMaster("leaveType", id));
}
