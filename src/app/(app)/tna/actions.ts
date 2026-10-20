"use server";

import { runAction } from "@/lib/action-result";
import { tnaService } from "@/services/tna.service";

export async function createTnaTemplateAction(input: {
  name: string;
  tasks: { name: string; daysBefore: number; sortOrder: number; dependsOnSortOrder?: number }[];
}) {
  return runAction(async () => {
    const row = await tnaService.createTemplate(input);
    return { id: row.id };
  });
}

export async function generateTnaPlanAction(input: {
  styleId: string;
  orderId?: string;
  templateId: string;
  shipDate?: string;
}) {
  return runAction(async () => {
    const row = await tnaService.generatePlan(input);
    return { id: row.id };
  });
}

export async function updateTnaTaskAction(
  taskId: string,
  patch: {
    status?: "NOT_STARTED" | "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "WAIVED";
    revisedDate?: string;
    actualDate?: string;
    delayReason?: string;
  }
) {
  return runAction(async () => {
    await tnaService.updateTask(taskId, patch);
    return { done: true };
  });
}

export async function refreshTnaPlanAction(planId: string) {
  return runAction(() => tnaService.refreshStatuses(planId));
}