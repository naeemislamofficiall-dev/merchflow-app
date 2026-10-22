"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { hrService } from "@/services/hr.service";

export async function createEmployeeAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await hrService.createEmployee(dropEmpty(values));
    return { id: r.id };
  });
}

export async function resignEmployeeAction(id: string, reason?: string) {
  return runAction(async () => {
    await hrService.setStatus(id, "RESIGNED", reason);
    return { id };
  });
}

export async function terminateEmployeeAction(id: string, reason?: string) {
  return runAction(async () => {
    await hrService.setStatus(id, "TERMINATED", reason);
    return { id };
  });
}

export async function reactivateEmployeeAction(id: string) {
  return runAction(async () => {
    await hrService.setStatus(id, "ACTIVE");
    return { id };
  });
}

export async function removeSkillAction(skillId: string) {
  return runAction(async () => hrService.removeSkill(skillId));
}
