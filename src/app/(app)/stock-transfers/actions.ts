"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { stockTransferService } from "@/services/stock-transfer.service";

export async function createTransferAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await stockTransferService.create(dropEmpty(values));
    return { id: row.id };
  });
}

export async function addTransferLineAction(id: string, values: Record<string, string>) {
  return runAction(async () => {
    const row = await stockTransferService.addLine(id, dropEmpty(values));
    return { id: row.id };
  });
}

export async function removeTransferLineAction(lineId: string) {
  return runAction(async () => stockTransferService.removeLine(lineId));
}

export async function completeTransferAction(id: string) {
  return runAction(async () => stockTransferService.complete(id));
}

export async function cancelTransferAction(id: string, reason?: string) {
  return runAction(async () => {
    await stockTransferService.cancel(id, reason ?? "");
    return { id };
  });
}
