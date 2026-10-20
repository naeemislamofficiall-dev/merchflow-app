"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { bomService } from "@/services/bom.service";

export async function createBomAction(styleId: string) {
  return runAction(async () => {
    const row = await bomService.create(styleId);
    return { id: row.id };
  });
}

// সংখ্যার ঘর ফর্মে string, সার্ভিসে number
function toItemInput(values: Record<string, string>) {
  const { rate, consumption, wastagePct, currency, ...rest } = dropEmpty(values);
  return {
    ...rest,
    ...(rate !== undefined ? { rate: Number(rate), currency: (currency ?? "USD").toUpperCase() } : {}),
    ...(consumption !== undefined ? { consumption: Number(consumption) } : {}),
    ...(wastagePct !== undefined ? { wastagePct: Number(wastagePct) } : {}),
  };
}

export async function addBomItemAction(bomId: string, values: Record<string, string>) {
  return runAction(async () => {
    const row = await bomService.addItem(bomId, toItemInput(values));
    return { id: row.id };
  });
}

export async function removeBomItemAction(itemId: string) {
  return runAction(async () => {
    await bomService.removeItem(itemId);
    return { id: itemId };
  });
}

export async function approveBomAction(bomId: string) {
  return runAction(async () => {
    await bomService.approve(bomId);
    return { id: bomId };
  });
}

export async function newBomRevisionAction(bomId: string) {
  return runAction(async () => {
    const row = await bomService.newRevision(bomId);
    return { id: row.id };
  });
}