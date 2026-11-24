"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { buyerService } from "@/services/buyer.service";


export async function createBuyerAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await buyerService.create(dropEmpty(values));
    return { id: row.id };
  });
}