"use server";

import { runAction } from "@/lib/action-result";
import { approvalService } from "@/services/approval.service";

export async function delegateAction(values: { toUserId: string; startDate: string; endDate: string; reason: string }) {
  return runAction(async () => {
    const row = await approvalService.delegate(values);
    return { id: row.id };
  });
}

export async function revokeDelegationAction(id: string) {
  return runAction(async () => {
    await approvalService.revokeDelegation(id);
    return { id };
  });
}

export async function setEscalationAction(workflowId: string, days: string) {
  return runAction(async () => {
    await approvalService.setEscalation(workflowId, days.trim() === "" ? null : Number(days));
    return { id: workflowId };
  });
}

export async function runEscalationAction() {
  return runAction(async () => {
    const r = await approvalService.escalateOverdue();
    return { escalated: r.escalated };
  });
}

export async function setWorkflowActiveAction(workflowId: string, active: boolean) {
  return runAction(async () => {
    await approvalService.setWorkflowActive(workflowId, active);
    return { id: workflowId };
  });
}