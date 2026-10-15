import { prisma } from "@/lib/prisma";

// PR-202610-0001 ধরনের নম্বর, প্রতি মাসে নতুন করে গোনা হয়
function monthPrefix(code: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${code}-${ym}-`;
}

function withCount(prefix: string, count: number): string {
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function nextPrNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("PR");
  const n = await prisma.purchaseRequisition.count({
    where: { companyId, prNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextEnquiryNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("ENQ");
  const n = await prisma.enquiry.count({
    where: { companyId, enquiryNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextOrderNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("ORD");
  const n = await prisma.order.count({
    where: { companyId, orderNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextSampleNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("SMP");
  const n = await prisma.sampleRequest.count({
    where: { companyId, sampleNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextQuotationNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("QT");
  const n = await prisma.supplierQuotation.count({
    where: { companyId, quotationNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextRfqNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("RFQ");
  const n = await prisma.rfq.count({
    where: { companyId, rfqNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextPoNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("PO");
  const n = await prisma.purchaseOrder.count({
    where: { companyId, poNo: { startsWith: prefix } },
  });
  return withCount(prefix, n);
}

export async function nextGrnNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("GRN");
  const n = await prisma.grn.count({ where: { companyId, grnNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextIssueNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("ISS");
  const n = await prisma.materialIssue.count({ where: { companyId, issueNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextReturnNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("RTN");
  const n = await prisma.materialReturn.count({ where: { companyId, returnNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextAdjustmentNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("ADJ");
  const n = await prisma.stockAdjustment.count({ where: { companyId, adjustmentNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}


export async function nextProductionNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("PRD");
  const n = await prisma.productionOrder.count({ where: { companyId, productionNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextCutPlanNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("CUT");
  const n = await prisma.cutPlan.count({ where: { companyId, cutPlanNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextSubcontractNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("SUB");
  const n = await prisma.subcontractOrder.count({ where: { companyId, subcontractNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextInspectionNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("QC");
  const n = await prisma.inspection.count({ where: { companyId, inspectionNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextAqlNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("AQL");
  const n = await prisma.aqlInspection.count({ where: { companyId, inspectionNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextCapaNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("CAPA");
  const n = await prisma.capa.count({ where: { companyId, capaNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextCartonNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("CTN");
  const n = await prisma.carton.count({ where: { companyId, cartonNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextShipmentNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("SHP");
  const n = await prisma.shipment.count({ where: { companyId, shipmentNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}


export async function nextSupplierInvoiceNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("SINV");
  const n = await prisma.supplierInvoice.count({ where: { companyId, invoiceNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextBuyerInvoiceNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("BINV");
  const n = await prisma.buyerInvoice.count({ where: { companyId, invoiceNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextPaymentNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("PAY");
  const n = await prisma.payment.count({ where: { companyId, paymentNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextExpenseNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("EXP");
  const n = await prisma.expense.count({ where: { companyId, expenseNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}