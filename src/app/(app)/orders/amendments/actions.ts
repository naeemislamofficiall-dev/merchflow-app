"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { orderService } from "@/services/order.service";

export async function amendOrderFormAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const buyerPoNo = String(formData.get("buyerPoNo") ?? "").trim();
  const shipDate = String(formData.get("shipDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!orderId || reason.length < 3) throw new Error("Order and a reason of at least 3 characters are required.");
  const changes: Record<string, unknown> = { orderId, reason };
  if (buyerPoNo) changes.buyerPoNo = buyerPoNo;
  if (shipDate) changes.shipDate = new Date(`${shipDate}T12:00:00`);
  if (notes) changes.notes = notes;
  await orderService.amend(changes);
  revalidatePath("/orders");
  revalidatePath("/orders/amendments");
  redirect("/orders/amendments?saved=1");
}
