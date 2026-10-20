"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { mrpService } from "@/services/mrp.service";

export async function runMrpAction(values: Record<string, string>) {
  return runAction(async () => {
    const { orderQty, ...rest } = dropEmpty(values);
    const row = await mrpService.run({ ...rest, orderQty: Number(orderQty) });
    return { id: row.id };
  });
}

export async function createPrFromMrpAction(mrpRunId: string) {
  return runAction(async () => {
    const pr = await mrpService.createPr(mrpRunId);
    return { id: pr.id, prNo: pr.prNo };
  });
}