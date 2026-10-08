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

// নিষ্ক্রিয় Supplier-কে নতুন PO বা কোটেশনে ব্যবহার করা যাবে না
export async function assertSupplierActive(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new BusinessRuleError("Supplier not found");
  if (supplier.status !== "ACTIVE") {
    throw new BusinessRuleError("Supplier is not active");
  }
  return supplier;
}

// PR জমা দেওয়ার আগে অন্তত একটা লাইন থাকতে হবে
export async function assertPrReadyForSubmit(prId: string) {
  const count = await prisma.purchaseRequisitionLine.count({ where: { prId } });
  if (count === 0) throw new BusinessRuleError("Add at least one PR line first");
}

// PO বানানো যাবে শুধু approved PR থেকে
export async function assertPrApprovedForPo(prId: string) {
  const pr = await prisma.purchaseRequisition.findUnique({ where: { id: prId } });
  if (!pr) throw new BusinessRuleError("PR not found");
  if (pr.status !== "APPROVED") {
    throw new BusinessRuleError("PR must be approved before creating a PO");
  }
  return pr;
}

// নিয়ম ১: দরকারি ঘর না থাকলে PO approve হবে না
export async function assertPoReadyForApproval(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true },
  });
  if (!po) throw new BusinessRuleError("PO not found");
  if (!po.deliveryDate) throw new BusinessRuleError("Delivery date is required");
  if (!po.paymentTerms) throw new BusinessRuleError("Payment terms are required");
  if (po.lines.length === 0) throw new BusinessRuleError("Add at least one PO line");
  for (const line of po.lines) {
    if (Number(line.quantity) <= 0 || Number(line.rate) <= 0) {
      throw new BusinessRuleError("Every PO line needs quantity and rate");
    }
  }
  return po;
}

// নিয়ম ২: PO বাতিল (Rejected) করতে কারণ লাগবে
export function assertRejectionReason(reason: string | undefined | null) {
  if (!reason || reason.trim().length < 3) {
    throw new BusinessRuleError("Rejection reason is required");
  }
}

// নিয়ম ৩: অর্ডারের বেশি মাল গ্রহণ করা যাবে না (বিশেষ অনুমতি ছাড়া)
export async function assertReceiptWithinOrder(
  poLineId: string,
  receiveQty: number,
  allowOver = false
) {
  const line = await prisma.purchaseOrderLine.findUnique({ where: { id: poLineId } });
  if (!line) throw new BusinessRuleError("PO line not found");
  const total = Number(line.receivedQty) + receiveQty;
  if (!allowOver && total > Number(line.quantity)) {
    throw new BusinessRuleError("Received quantity cannot exceed ordered quantity");
  }
  return line;
}

// RFQ পাঠাতে অন্তত একটা লাইন আর একটা Supplier লাগবে
export async function assertRfqReadyToSend(rfqId: string) {
  const [lines, suppliers] = await Promise.all([
    prisma.rfqLine.count({ where: { rfqId } }),
    prisma.rfqSupplier.count({ where: { rfqId } }),
  ]);
  if (lines === 0) throw new BusinessRuleError("Add at least one RFQ line first");
  if (suppliers === 0) throw new BusinessRuleError("Add at least one supplier first");
}