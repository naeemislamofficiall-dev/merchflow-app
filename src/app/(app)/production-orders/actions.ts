"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { productionOrderService } from "@/services/production-order.service";

type ProductionValues = {
  factoryId: string;
  orderId: string;
  styleId: string;
  routeId: string;
  lineId: string;
  quantity: string;
  startDate: string;
  endDate: string;
  priority: string;
  allowancePct: string;
  remarks: string;
};

export async function createProductionAction(values: ProductionValues) {
  return runAction(async () => {
    const { quantity, priority, allowancePct, ...rest } = dropEmpty(values);
    const row = await productionOrderService.create({
      ...rest,
      quantity: Number(quantity),
      ...(priority !== undefined ? { priority: Number(priority) } : {}),
      ...(allowancePct !== undefined ? { allowancePct: Number(allowancePct) } : {}),
    });
    return { id: row.id };
  });
}

export async function releaseProductionAction(id: string) {
  return runAction(async () => {
    await productionOrderService.release(id);
    return { id };
  });
}

export async function startProductionAction(id: string) {
  return runAction(async () => {
    await productionOrderService.start(id);
    return { id };
  });
}

export async function pauseProductionAction(id: string, reason: string) {
  return runAction(async () => {
    await productionOrderService.pause(id, reason);
    return { id };
  });
}

export async function resumeProductionAction(id: string) {
  return runAction(async () => {
    await productionOrderService.resume(id);
    return { id };
  });
}

export async function completeProductionAction(id: string, completedQty: number, overReason: string) {
  return runAction(async () => {
    await productionOrderService.complete(id, { completedQty, ...(overReason ? { overReason } : {}) });
    return { id };
  });
}

export async function closeProductionAction(id: string) {
  return runAction(async () => {
    await productionOrderService.close(id);
    return { id };
  });
}

export async function cancelProductionAction(id: string, reason: string) {
  return runAction(async () => {
    await productionOrderService.cancel(id, reason);
    return { id };
  });
}