"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { packingService } from "@/services/packing.service";

type Measures = {
  grossWeightKg: string;
  netWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};
type CartonValues = Measures & {
  orderId: string;
  packType: string;
  lines: { productionOrderId: string; colorId: string; sizeId: string; quantity: string }[];
};

function measures(m: Measures) {
  const d = dropEmpty(m);
  return {
    ...(d.grossWeightKg !== undefined ? { grossWeightKg: Number(d.grossWeightKg) } : {}),
    ...(d.netWeightKg !== undefined ? { netWeightKg: Number(d.netWeightKg) } : {}),
    ...(d.lengthCm !== undefined ? { lengthCm: Number(d.lengthCm) } : {}),
    ...(d.widthCm !== undefined ? { widthCm: Number(d.widthCm) } : {}),
    ...(d.heightCm !== undefined ? { heightCm: Number(d.heightCm) } : {}),
  };
}

export async function createCartonAction(values: CartonValues) {
  return runAction(async () => {
    const { lines, orderId, packType, ...m } = values;
    const row = await packingService.createCarton({
      orderId,
      ...(packType ? { packType } : {}),
      ...measures(m),
      lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity) })),
    });
    return { id: row.id };
  });
}

export async function updateCartonAction(id: string, values: Measures) {
  return runAction(async () => {
    await packingService.updateDetails(id, measures(values));
    return { id };
  });
}

export async function closeCartonAction(id: string) {
  return runAction(async () => {
    await packingService.close(id);
    return { id };
  });
}

export async function reopenCartonAction(id: string) {
  return runAction(async () => {
    await packingService.reopen(id);
    return { id };
  });
}

export async function removeCartonAction(id: string) {
  return runAction(async () => {
    await packingService.remove(id);
    return { id };
  });
}