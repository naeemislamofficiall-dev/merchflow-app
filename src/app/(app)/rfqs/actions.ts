"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { rfqService } from "@/services/rfq.service";

export async function createRfqAction(values: {
  prId: string;
  dueDate: string;
  notes: string;
  supplierIds: string[];
}) {
  return runAction(async () => {
    const { supplierIds, ...rest } = values;
    const row = await rfqService.create({ ...dropEmpty(rest), supplierIds });
    return { id: row.id };
  });
}

export async function addRfqSupplierAction(rfqId: string, supplierId: string) {
  return runAction(async () => {
    await rfqService.addSupplier(rfqId, supplierId);
    return { id: rfqId };
  });
}

export async function removeRfqSupplierAction(rfqId: string, supplierId: string) {
  return runAction(async () => {
    await rfqService.removeSupplier(rfqId, supplierId);
    return { id: rfqId };
  });
}

export async function sendRfqAction(id: string) {
  return runAction(async () => {
    await rfqService.send(id);
    return { id };
  });
}

export async function closeRfqAction(id: string) {
  return runAction(async () => {
    await rfqService.changeStatus(id, "CLOSED");
    return { id };
  });
}

export async function cancelRfqAction(id: string) {
  return runAction(async () => {
    await rfqService.changeStatus(id, "CANCELLED");
    return { id };
  });
}