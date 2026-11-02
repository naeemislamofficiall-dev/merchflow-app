"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { BusinessRuleError } from "@/lib/business-rules";
import { inventoryService } from "@/services/inventory.service";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createStockTransferAction(formData: FormData) {
  const user = await requirePermission("inventory.transfer");

  const materialId = s(formData, "materialId");
  const fromWarehouseId = s(formData, "fromWarehouseId");
  const toWarehouseId = s(formData, "toWarehouseId");
  const fromBinId = s(formData, "fromBinId");
  const toBinId = s(formData, "toBinId");
  const rollNo = s(formData, "rollNo");
  const remarks = s(formData, "remarks");
  const qtyRaw = s(formData, "quantity");

  let error = "";
  try {
    if (!materialId || !fromWarehouseId || !toWarehouseId) {
      throw new BusinessRuleError("Material, source and destination warehouse are required.");
    }

    // Roll number diye dile roll-er puro quantity jabe (service-er niyom), tai quantity lagbe na
    let rollId: string | undefined;
    if (rollNo) {
      const roll = await prisma.fabricRoll.findFirst({
        where: { companyId: user.companyId, rollNo, materialId },
        select: { id: true },
      });
      if (!roll) throw new BusinessRuleError(`Roll "${rollNo}" not found for this material.`);
      rollId = roll.id;
    }

    const quantity = qtyRaw ? Number(qtyRaw) : undefined;
    if (!rollId && !(quantity && quantity > 0)) {
      throw new BusinessRuleError("Enter a quantity, or a roll number to move the whole roll.");
    }

    await inventoryService.transfer({
      materialId,
      fromWarehouseId,
      toWarehouseId,
      ...(fromBinId ? { fromBinId } : {}),
      ...(toBinId ? { toBinId } : {}),
      ...(rollId ? { rollId } : {}),
      ...(quantity && !rollId ? { quantity } : {}),
      ...(remarks ? { remarks } : {}),
    });
  } catch (e) {
    if (e instanceof BusinessRuleError) error = e.message;
    else if (e instanceof ZodError) error = "Invalid input: " + e.issues.map((i) => i.message).join(", ");
    else throw e; // permission/DB error: Next error page dekhabe
  }

  // redirect() try-er baire rakha hoyeche, noile catch eta dhore felbe
  if (error) redirect(`/inventory/transfers?error=${encodeURIComponent(error)}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/transfers");
  redirect("/inventory/transfers?saved=1");
}
