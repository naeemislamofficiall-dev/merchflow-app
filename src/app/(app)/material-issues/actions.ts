"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { materialIssueService } from "@/services/material-issue.service";

type IssueLineValues = { materialId: string; quantity: string };
type IssueValues = {
  warehouseId: string;
  targetType: string;
  orderId: string;
  overrideReason: string;
  remarks: string;
  lines: IssueLineValues[];
};

export async function issueMaterialAction(values: IssueValues) {
  return runAction(async () => {
    const { lines, ...header } = values;
    const row = await materialIssueService.issue({
      ...dropEmpty(header),
      lines: lines.map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) })),
    });
    return { id: row.id };
  });
}