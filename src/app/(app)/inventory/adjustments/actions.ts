"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inventoryService } from "@/services/inventory.service";
export async function createStockAdjustmentAction(formData: FormData) {
  const materialId=String(formData.get("materialId")??""); const warehouseId=String(formData.get("warehouseId")??"");
  const quantityChange=Number(formData.get("quantityChange")); const reason=String(formData.get("reason")??""); const remarks=String(formData.get("remarks")??"").trim();
  const binId=String(formData.get("binId")??"").trim(); const lotId=String(formData.get("lotId")??"").trim();
  if(!materialId||!warehouseId||!Number.isFinite(quantityChange)||quantityChange===0||remarks.length<3) throw new Error("Material, warehouse, non-zero quantity and a reason are required.");
  await inventoryService.adjust({materialId,warehouseId,quantityChange,reason,remarks,...(binId?{binId}:{}),...(lotId?{lotId}:{})});
  revalidatePath("/inventory"); revalidatePath("/inventory/adjustments"); redirect("/inventory/adjustments?saved=1");
}
