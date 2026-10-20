"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { materialService } from "@/services/material.service";

// ফর্মের সংখ্যার ঘর string হিসেবে আসে, সার্ভিসের জন্য number বানানো হয়
function toInput(values: Record<string, string>) {
  const { reorderPoint, ...rest } = dropEmpty(values);
  return { ...rest, ...(reorderPoint !== undefined ? { reorderPoint: Number(reorderPoint) } : {}) };
}

export async function createMaterialAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await materialService.create(toInput(values));
    return { id: row.id };
  });
}

export async function updateMaterialAction(id: string, values: Record<string, string>) {
  return runAction(async () => {
    // code বদলানো যায় না
    const { code: _code, ...rest } = toInput(values) as Record<string, unknown>;
    void _code;
    await materialService.update(id, rest);
    return { id };
  });
}

export async function setMaterialActiveAction(id: string, active: boolean) {
  return runAction(async () => {
    await materialService.setActive(id, active);
    return { id };
  });
}

export async function createCategoryAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await materialService.createCategory(dropEmpty(values));
    return { id: row.id };
  });
}