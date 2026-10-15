"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { styleService } from "@/services/style.service";
import type { StyleStatus } from "@/generated/prisma/enums";

export async function createStyleAction(values: Record<string, string>) {
  return runAction(async () => {
    const { gsm, ...rest } = dropEmpty(values);
    // service-এ gsm সংখ্যা চায়, ফর্ম থেকে আসে string
    const row = await styleService.create({ ...rest, ...(gsm ? { gsm: Number(gsm) } : {}) });
    return { id: row.id };
  });
}

export async function changeStyleStatusAction(id: string, to: StyleStatus) {
  return runAction(async () => {
    await styleService.changeStatus(id, to);
    return { done: true };
  });
}

export async function addColorAction(styleId: string, code: string, name: string) {
  return runAction(async () => {
    await styleService.addColor({ styleId, code: code.trim(), name: name.trim() });
    return { done: true };
  });
}

export async function addSizeAction(styleId: string, label: string) {
  return runAction(async () => {
    await styleService.addSize({ styleId, label: label.trim() });
    return { done: true };
  });
}

export async function removeColorAction(colorId: string) {
  return runAction(async () => {
    await styleService.removeColor(colorId);
    return { done: true };
  });
}

export async function removeSizeAction(sizeId: string) {
  return runAction(async () => {
    await styleService.removeSize(sizeId);
    return { done: true };
  });
}

export async function saveMatrixAction(
  styleId: string,
  cells: { colorId: string; sizeId: string; quantity: number }[]
) {
  return runAction(async () => {
    const m = await styleService.setMatrix(styleId, cells);
    return { total: m.total };
  });
}