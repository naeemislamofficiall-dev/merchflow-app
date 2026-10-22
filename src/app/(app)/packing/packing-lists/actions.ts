"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { packingListService } from "@/services/packing-list.service";

export async function createPackingListAction(values: { shipmentId: string; remarks: string }) {
  return runAction(async () => {
    const row = await packingListService.create(dropEmpty(values));
    return { id: row.id };
  });
}

export async function refreshPackingListAction(id: string) {
  return runAction(async () => {
    await packingListService.refresh(id);
    return { id };
  });
}

export async function issuePackingListAction(id: string) {
  return runAction(async () => {
    await packingListService.issue(id);
    return { id };
  });
}

export async function cancelPackingListAction(id: string, reason: string) {
  return runAction(async () => {
    await packingListService.cancel(id, reason);
    return { id };
  });
}
