"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { quotationService } from "@/services/quotation.service";

export async function createQuotationAction(values: {
  supplierId: string;
  materialId: string;
  rfqId: string;
  unitPrice: string;
  currency: string;
  leadTimeDays: string;
  qualityRating: string;
  paymentTerms: string;
  validUntil: string;
  notes: string;
}) {
  return runAction(async () => {
    const { unitPrice, leadTimeDays, qualityRating, ...rest } = dropEmpty(values);
    const row = await quotationService.create({
      ...rest,
      unitPrice: Number(unitPrice),
      ...(leadTimeDays !== undefined ? { leadTimeDays: Number(leadTimeDays) } : {}),
      ...(qualityRating !== undefined ? { qualityRating: Number(qualityRating) } : {}),
    });
    return { id: row.id };
  });
}

export async function recommendQuotationAction(id: string) {
  return runAction(async () => {
    await quotationService.recommend(id);
    return { id };
  });
}

export async function approveQuotationAction(id: string) {
  return runAction(async () => {
    await quotationService.approve(id);
    return { id };
  });
}

export async function rejectQuotationAction(id: string, reason: string) {
  return runAction(async () => {
    await quotationService.reject(id, reason);
    return { id };
  });
}