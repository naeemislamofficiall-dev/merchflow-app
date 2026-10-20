"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { grnService } from "@/services/grn.service";

type GrnLineValues = {
  poLineId: string;
  receivedQty: string;
  lotNo: string;
  color: string;
  shade: string;
  binId: string;
  overReason: string;
  rolls: string; // প্রতি লাইনে একটা রোল: "পরিমাণ" বা "পরিমাণ, shade"
};
type GrnValues = {
  poId: string;
  warehouseId: string;
  receivedDate: string;
  challanNo: string;
  remarks: string;
  lines: GrnLineValues[];
};

function parseRolls(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((row) => {
      const [qty, shade] = row.split(",").map((x) => x.trim());
      return { quantity: Number(qty), ...(shade ? { shade } : {}) };
    });
}

function toLine(l: GrnLineValues) {
  const { receivedQty, rolls, ...rest } = dropEmpty(l);
  return {
    ...rest,
    receivedQty: Number(receivedQty),
    ...(rolls ? { rolls: parseRolls(rolls) } : {}),
  };
}

export async function createGrnAction(values: GrnValues) {
  return runAction(async () => {
    const { lines, ...header } = values;
    const row = await grnService.create({ ...dropEmpty(header), lines: lines.map(toLine) });
    return { id: row.id };
  });
}

export async function postGrnAction(id: string) {
  return runAction(async () => {
    await grnService.post(id);
    return { id };
  });
}

export async function cancelGrnAction(id: string, reason: string) {
  return runAction(async () => {
    await grnService.cancel(id, reason);
    return { id };
  });
}