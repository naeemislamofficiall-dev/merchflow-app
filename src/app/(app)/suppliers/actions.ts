"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { supplierService } from "@/services/supplier.service";

// leadTimeDays ফর্মে string, সার্ভিসে int
function toInput(values: Record<string, string>) {
  const { leadTimeDays, currency, ...rest } = dropEmpty(values);
  return {
    ...rest,
    ...(currency !== undefined ? { currency: currency.toUpperCase() } : {}),
    ...(leadTimeDays !== undefined ? { leadTimeDays: Number(leadTimeDays) } : {}),
  };
}

export async function createSupplierAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await supplierService.create(toInput(values));
    return { id: row.id };
  });
}

export async function updateSupplierAction(id: string, values: Record<string, string>) {
  return runAction(async () => {
    // code বদলানো যায় না
    const { code: _code, ...rest } = toInput(values) as Record<string, unknown>;
    void _code;
    await supplierService.update(id, rest);
    return { id };
  });
}

export async function setSupplierActiveAction(id: string, active: boolean) {
  return runAction(async () => {
    await supplierService.setActive(id, active);
    return { id };
  });
}

export async function addSupplierContactAction(
  supplierId: string,
  values: Record<string, string>,
  isPrimary: boolean
) {
  return runAction(async () => {
    const row = await supplierService.addContact({ ...dropEmpty(values), supplierId, isPrimary });
    return { id: row.id };
  });
}