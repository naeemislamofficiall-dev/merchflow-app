import { prisma } from "@/lib/prisma";

export class BusinessRuleError extends Error {}

// Buyer সক্রিয় না থাকলে নতুন Enquiry বা Style খোলা যাবে না
export async function assertBuyerActive(buyerId: string) {
  const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
  if (!buyer) throw new BusinessRuleError("Buyer not found");
  if (buyer.status !== "ACTIVE") {
    throw new BusinessRuleError("Buyer is not active");
  }
  return buyer;
}

// Style approve করার আগে অন্তত একটা রং আর একটা সাইজ থাকতে হবে
export async function assertStyleReadyForApproval(styleId: string) {
  const [colors, sizes] = await Promise.all([
    prisma.styleColor.count({ where: { styleId } }),
    prisma.styleSize.count({ where: { styleId } }),
  ]);
  if (colors === 0) throw new BusinessRuleError("Add at least one color first");
  if (sizes === 0) throw new BusinessRuleError("Add at least one size first");
}

// ARCHIVED Style-এ নতুন Sample, Costing বা BOM বানানো যাবে না
export async function assertStyleOpen(styleId: string) {
  const style = await prisma.style.findUnique({ where: { id: styleId } });
  if (!style) throw new BusinessRuleError("Style not found");
  if (style.status === "ARCHIVED") {
    throw new BusinessRuleError("Style is archived");
  }
  return style;
}

// BOM approve করার আগে অন্তত একটা আইটেম থাকতে হবে
export async function assertBomReadyForApproval(bomId: string) {
  const count = await prisma.bomItem.count({ where: { bomId } });
  if (count === 0) throw new BusinessRuleError("Add at least one BOM item first");
}

// MRP চালানো যাবে শুধু approved BOM দিয়ে
export async function assertBomApproved(bomId: string) {
  const bom = await prisma.bom.findUnique({ where: { id: bomId } });
  if (!bom) throw new BusinessRuleError("BOM not found");
  if (bom.status !== "APPROVED") {
    throw new BusinessRuleError("BOM must be approved before running MRP");
  }
  return bom;
}

// Costing submit করার আগে অন্তত একটা খরচের আইটেম থাকতে হবে
export async function assertCostSheetHasItems(costSheetId: string) {
  const count = await prisma.costItem.count({ where: { costSheetId } });
  if (count === 0) throw new BusinessRuleError("Add at least one cost item first");
}