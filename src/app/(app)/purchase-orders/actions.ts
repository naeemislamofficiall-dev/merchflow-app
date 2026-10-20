"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { poService } from "@/services/po.service";

type PoLineValues = {
  prLineId: string;
  quantity: string;
  rate: string;
  taxPct: string;
  deliveryDate: string;
};
type PoValues = {
  prId: string;
  supplierId: string;
  currency: string;
  paymentTerms: string;
  incoterms: string;
  destination: string;
  deliveryDate: string;
  lines: PoLineValues[];
};

// ফর্মের string মান সার্ভিসের জন্য গুছিয়ে দেয়: ফাঁকা ঘর বাদ, সংখ্যা number
function toLine(l: PoLineValues) {
  const { quantity, rate, taxPct, ...rest } = dropEmpty(l);
  return {
    ...rest,
    rate: Number(rate),
    ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
    ...(taxPct !== undefined ? { taxPct: Number(taxPct) } : {}),
  };
}

export async function createPoAction(values: PoValues) {
  return runAction(async () => {
    const { lines, ...header } = values;
    const row = await poService.createFromPr({ ...dropEmpty(header), lines: lines.map(toLine) });
    return { id: row.id };
  });
}

export async function submitPoAction(id: string) {
  return runAction(async () => {
    await poService.submit(id);
    return { id };
  });
}

export async function approvePoAction(id: string) {
  return runAction(async () => {
    await poService.approve(id);
    return { id };
  });
}

export async function rejectPoAction(id: string, reason: string) {
  return runAction(async () => {
    await poService.reject(id, reason);
    return { id };
  });
}

export async function revisePoAction(id: string) {
  return runAction(async () => {
    await poService.revise(id);
    return { id };
  });
}

export async function sendPoAction(id: string) {
  return runAction(async () => {
    await poService.send(id);
    return { id };
  });
}

export async function acknowledgePoAction(id: string, promisedDate: string) {
  return runAction(async () => {
    await poService.acknowledge(id, promisedDate ? new Date(promisedDate) : undefined);
    return { id };
  });
}

export async function closePoAction(id: string) {
  return runAction(async () => {
    await poService.close(id);
    return { id };
  });
}

export async function cancelPoAction(id: string, reason: string) {
  return runAction(async () => {
    await poService.cancel(id, reason);
    return { id };
  });
}
