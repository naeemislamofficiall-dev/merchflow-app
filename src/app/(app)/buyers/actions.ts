"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { buyerService } from "@/services/buyer.service";

// ফর্ম থেকে আসা মান সার্ভিসে পাঠায়। সব মডিউলের create/update অ্যাকশন এই ছাঁচে হবে।
export async function createBuyerAction(values: Record<string, string>) {
  return runAction(async () => {
    const row = await buyerService.create(dropEmpty(values));
    return { id: row.id };
  });
}