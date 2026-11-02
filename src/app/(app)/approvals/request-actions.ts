"use server";

import { runAction } from "@/lib/action-result";
import { approvalService } from "@/services/approval.service";

export async function requestApprovalAction(v: { entityType: string; entityId: string; title: string; amount?: number }) {
  return runAction(async () => {
    const row = await approvalService.submit(v);
    return { id: row.id };
  });
}