"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { subcontractService } from "@/services/subcontract.service";

export async function sendSubcontractAction(values: {
  productionOrderId: string;
  vendorId: string;
  process: string;
  challanNo: string;
  sentQty: string;
  rate: string;
  currency: string;
  sentDate: string;
  dueDate: string;
  remarks: string;
}) {
  return runAction(async () => {
    const { sentQty, rate, ...rest } = dropEmpty(values);
    const row = await subcontractService.send({ ...rest, sentQty: Number(sentQty), rate: Number(rate) });
    return { id: row.id };
  });
}

function step(fn: (id: string) => Promise<unknown>) {
  return async (id: string) =>
    runAction(async () => {
      await fn(id);
      return { id };
    });
}

export const confirmVendorAction = step((id) => subcontractService.confirmVendorReceipt(id));
export const startProcessAction = step((id) => subcontractService.startProcess(id));
export const completeQcAction = step((id) => subcontractService.completeQc(id));

export async function receiveReturnAction(values: {
  subcontractId: string;
  receiptDate: string;
  challanNo: string;
  receivedQty: string;
  damageQty: string;
  rejectQty: string;
  remarks: string;
}) {
  return runAction(async () => {
    const { receivedQty, damageQty, rejectQty, ...rest } = dropEmpty(values);
    await subcontractService.receiveReturn({
      ...rest,
      receivedQty: Number(receivedQty ?? 0),
      damageQty: Number(damageQty ?? 0),
      rejectQty: Number(rejectQty ?? 0),
    });
    return { id: values.subcontractId };
  });
}

export async function closeSubcontractAction(id: string, reason: string) {
  return runAction(async () => {
    await subcontractService.close(id, reason || undefined);
    return { id };
  });
}

export async function cancelSubcontractAction(id: string, reason: string) {
  return runAction(async () => {
    await subcontractService.cancel(id, reason);
    return { id };
  });
}