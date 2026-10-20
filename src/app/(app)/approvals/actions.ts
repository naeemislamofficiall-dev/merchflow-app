"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-result";
import { approvalService } from "@/services/approval.service";

function refresh() {
  revalidatePath("/approvals");
  revalidatePath("/", "layout"); // টপবারের ঘণ্টা
}

export async function decideApprovalAction(id: string, decision: "APPROVED" | "REJECTED", note: string) {
  return runAction(async () => {
    await approvalService.decide(id, decision, note.trim() || undefined);
    refresh();
    return { id };
  });
}

export async function cancelApprovalAction(id: string) {
  return runAction(async () => {
    await approvalService.cancel(id);
    refresh();
    return { id };
  });
}

export async function createWorkflowAction(values: {
  code: string;
  name: string;
  entityType: string;
  minAmount: string;
  maxAmount: string;
  steps: { name: string; approverRoleId: string }[];
}) {
  return runAction(async () => {
    const row = await approvalService.createWorkflow({
      code: values.code.trim(),
      name: values.name.trim(),
      entityType: values.entityType,
      minAmount: values.minAmount.trim() ? Number(values.minAmount) : undefined,
      maxAmount: values.maxAmount.trim() ? Number(values.maxAmount) : undefined,
      steps: values.steps.map((s) => ({ name: s.name.trim(), approverRoleId: s.approverRoleId })),
    });
    refresh();
    return { id: row.id };
  });
}