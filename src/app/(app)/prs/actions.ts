"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { prService } from "@/services/pr.service";

type PrLineValues = { materialId: string; quantity: string; remarks: string };
type PrValues = {
  source: string;
  priority: string;
  requiredDate: string;
  reason: string;
  lines: PrLineValues[];
};

// ফর্মের string মান সার্ভিসের জন্য গুছিয়ে দেয়: ফাঁকা ঘর বাদ, পরিমাণ number
function toLine(l: PrLineValues) {
  const { quantity, ...rest } = dropEmpty(l);
  return { ...rest, quantity: Number(quantity) };
}

export async function createPrAction(values: PrValues) {
  return runAction(async () => {
    const { lines, ...header } = values;
    const row = await prService.create({ ...dropEmpty(header), lines: lines.map(toLine) });
    return { id: row.id };
  });
}

export async function createPrFromReorderAction() {
  return runAction(async () => {
    const row = await prService.createFromReorder();
    return { id: row.id };
  });
}

export async function addPrLineAction(prId: string, values: PrLineValues) {
  return runAction(async () => {
    const row = await prService.addLine(prId, toLine(values));
    return { id: row.id };
  });
}

export async function removePrLineAction(lineId: string) {
  return runAction(async () => {
    await prService.removeLine(lineId);
    return { id: lineId };
  });
}

export async function submitPrAction(id: string) {
  return runAction(async () => {
    await prService.submit(id);
    return { id };
  });
}

export async function approvePrAction(id: string) {
  return runAction(async () => {
    await prService.approve(id);
    return { id };
  });
}

export async function rejectPrAction(id: string, reason: string) {
  return runAction(async () => {
    await prService.reject(id, reason);
    return { id };
  });
}

export async function changePrStatusAction(id: string, to: "DRAFT" | "CANCELLED" | "CLOSED") {
  return runAction(async () => {
    await prService.changeStatus(id, to);
    return { id };
  });
}