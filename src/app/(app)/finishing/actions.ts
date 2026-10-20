"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { finishingService } from "@/services/finishing.service";

type FinishingValues = {
  productionOrderId: string;
  logDate: string;
  inputQty: string;
  threadCutQty: string;
  ironedQty: string;
  foldedQty: string;
  metalCheckedQty: string;
  qcPassedQty: string;
  reworkQty: string;
  outputQty: string;
  remarks: string;
};

export async function saveFinishingAction(values: FinishingValues) {
  return runAction(async () => {
    const { productionOrderId, logDate, remarks, ...nums } = dropEmpty(values);
    const counts = Object.fromEntries(Object.entries(nums).map(([k, v]) => [k, Number(v)]));
    const row = await finishingService.save({
      productionOrderId,
      logDate,
      ...(remarks !== undefined ? { remarks } : {}),
      ...counts,
    });
    return { id: row.id };
  });
}