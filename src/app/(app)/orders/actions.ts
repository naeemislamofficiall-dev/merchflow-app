"use server";

import { runAction } from "@/lib/action-result";
import { orderService } from "@/services/order.service";

export type CreateOrderInput = {
  buyerId: string;
  buyerPoNo?: string;
  currency?: string;
  shipDate?: string;
  notes?: string;
  lines: { styleId: string; quantity: number; unitPrice: number; shipDate?: string }[];
};

export async function createOrderAction(input: CreateOrderInput) {
  return runAction(async () => {
    const row = await orderService.create(input);
    return { id: row.id };
  });
}

export async function confirmOrderAction(orderId: string) {
  return runAction(async () => {
    await orderService.confirm(orderId);
    return { done: true };
  });
}

export async function cancelOrderAction(orderId: string, reason: string) {
  return runAction(async () => {
    await orderService.cancel(orderId, reason);
    return { done: true };
  });
}

export async function saveLineMatrixAction(
  orderLineId: string,
  cells: { colorId: string; sizeId: string; quantity: number }[]
) {
  return runAction(async () => {
    const rows = await orderService.setMatrix(orderLineId, cells);
    return { cells: rows.length };
  });
}