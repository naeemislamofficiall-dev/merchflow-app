"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { poService } from "@/services/po.service";

export async function createProformaInvoiceAction(formData: FormData) {
  const poId = String(formData.get("poId") ?? "").trim();
  const piNo = String(formData.get("piNo") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const piDate = String(formData.get("piDate") ?? "").trim();
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  if (!poId || !piNo || !Number.isFinite(amount) || amount <= 0) throw new Error("PO, PI number and a positive amount are required.");
  await poService.addProformaInvoice({ poId, piNo, amount, currency, ...(piDate ? { piDate: new Date(`${piDate}T12:00:00`) } : {}), ...(fileUrl ? { fileUrl } : {}) });
  revalidatePath("/purchase-orders/proforma-invoices");
  redirect("/purchase-orders/proforma-invoices?saved=1");
}
