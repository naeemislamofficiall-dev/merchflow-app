"use server";

import { runAction } from "@/lib/action-result";
import { costingService } from "@/services/costing.service";
import type { CostCategoryName } from "./categories";

export type CostItemInput = {
  category: CostCategoryName;
  description: string;
  unit?: string;
  consumption?: number;
  unitPrice: number;
  wastagePct?: number;
};

export async function createCostSheetAction(input: {
  styleId: string;
  currency?: string;
  marginPct?: number;
  costType?: "PRE" | "POST";
  orderId?: string;
  sourceCostSheetId?: string;
}) {
  return runAction(async () => {
    const row = await costingService.create(input);
    return { id: row.id };
  });
}

export async function addCostItemAction(sheetId: string, item: CostItemInput) {
  return runAction(async () => {
    await costingService.addItem(sheetId, item);
    return { done: true };
  });
}

export async function updateCostItemAction(itemId: string, patch: Partial<CostItemInput>) {
  return runAction(async () => {
    await costingService.updateItem(itemId, patch);
    return { done: true };
  });
}

export async function removeCostItemAction(itemId: string) {
  return runAction(async () => {
    await costingService.removeItem(itemId);
    return { done: true };
  });
}

export async function setMarginAction(sheetId: string, marginPct: number) {
  return runAction(async () => {
    await costingService.setMargin(sheetId, marginPct);
    return { done: true };
  });
}

export async function setPriceAction(sheetId: string, price: number) {
  return runAction(async () => {
    await costingService.setPrice(sheetId, price);
    return { done: true };
  });
}

export async function submitCostSheetAction(id: string) {
  return runAction(async () => {
    await costingService.submit(id);
    return { done: true };
  });
}

export async function approveCostSheetAction(id: string) {
  return runAction(async () => {
    await costingService.approve(id);
    return { done: true };
  });
}

export async function rejectCostSheetAction(id: string, reason: string) {
  return runAction(async () => {
    await costingService.reject(id, reason);
    return { done: true };
  });
}

export async function reopenCostSheetAction(id: string) {
  return runAction(async () => {
    await costingService.reopen(id);
    return { done: true };
  });
}

export async function newCostVersionAction(id: string) {
  return runAction(async () => {
    const row = await costingService.newVersion(id);
    return { id: row.id };
  });
}