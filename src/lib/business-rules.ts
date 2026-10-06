import { prisma } from "@/lib/prisma";

export class BusinessRuleError extends Error {}


export async function assertBuyerActive(buyerId: string) {
  const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
  if (!buyer) throw new BusinessRuleError("Buyer not found");
  if (buyer.status !== "ACTIVE") {
    throw new BusinessRuleError("Buyer is not active");
  }
  return buyer;
}


export async function assertStyleReadyForApproval(styleId: string) {
  const [colors, sizes] = await Promise.all([
    prisma.styleColor.count({ where: { styleId } }),
    prisma.styleSize.count({ where: { styleId } }),
  ]);
  if (colors === 0) throw new BusinessRuleError("Add at least one color first");
  if (sizes === 0) throw new BusinessRuleError("Add at least one size first");
}

export async function assertStyleOpen(styleId: string) {
  const style = await prisma.style.findUnique({ where: { id: styleId } });
  if (!style) throw new BusinessRuleError("Style not found");
  if (style.status === "ARCHIVED") {
    throw new BusinessRuleError("Style is archived");
  }
  return style;
}


export async function assertBomReadyForApproval(bomId: string) {
  const count = await prisma.bomItem.count({ where: { bomId } });
  if (count === 0) throw new BusinessRuleError("Add at least one BOM item first");
}


export async function assertBomApproved(bomId: string) {
  const bom = await prisma.bom.findUnique({ where: { id: bomId } });
  if (!bom) throw new BusinessRuleError("BOM not found");
  if (bom.status !== "APPROVED") {
    throw new BusinessRuleError("BOM must be approved before running MRP");
  }
  return bom;
}

export async function assertCostSheetHasItems(costSheetId: string) {
  const count = await prisma.costItem.count({ where: { costSheetId } });
  if (count === 0) throw new BusinessRuleError("Add at least one cost item first");
}

export async function assertOrderEditable(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new BusinessRuleError("Order not found");
  if (order.status === "CLOSED" || order.status === "CANCELLED") {
    throw new BusinessRuleError("Closed order can only change through an amendment");
  }
  return order;
}


export async function assertBomEditable(bomId: string) {
  const bom = await prisma.bom.findUnique({ where: { id: bomId } });
  if (!bom) throw new BusinessRuleError("BOM not found");
  if (bom.status === "APPROVED") {
    throw new BusinessRuleError("Approved BOM cannot be edited. Create a new revision");
  }
  return bom;
}


export async function assertCostSheetEditable(costSheetId: string) {
  const sheet = await prisma.costSheet.findUnique({ where: { id: costSheetId } });
  if (!sheet) throw new BusinessRuleError("Cost sheet not found");
  if (sheet.status === "APPROVED") {
    throw new BusinessRuleError("Approved costing cannot be edited. Create a new revision");
  }
  return sheet;
}