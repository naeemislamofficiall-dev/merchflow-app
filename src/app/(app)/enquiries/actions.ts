"use server";

import { runAction } from "@/lib/action-result";
import { enquiryService } from "@/services/enquiry.service";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export type CreateEnquiryInput = {
  buyerId: string;
  currency?: string;
  receivedDate?: string;
  requiredShipDate?: string;
  fabric?: string;
  productType?: string;
  notes?: string;
  items: { styleId?: string; description: string; quantity: number; targetPrice?: number }[];
};

export async function createEnquiryAction(input: CreateEnquiryInput) {
  return runAction(async () => {
    const row = await enquiryService.create(input);
    return { id: row.id };
  });
}

export async function changeEnquiryStatusAction(id: string, to: EnquiryStatus) {
  return runAction(async () => {
    await enquiryService.changeStatus(id, to);
    return { done: true };
  });
}

export async function addNegotiationAction(input: {
  enquiryId: string;
  initialQuotedPrice?: number;
  buyerTarget?: number;
  revisedPrice?: number;
  reason?: string;
}) {
  return runAction(async () => {
    await enquiryService.addNegotiation(input);
    return { done: true };
  });
}

export async function convertEnquiryAction(
  id: string,
  input: { buyerPoNo?: string; shipDate?: string; prices: Record<string, number> }
) {
  return runAction(async () => {
    const order = await enquiryService.convertToOrder(id, input);
    return { orderId: order.id };
  });
}