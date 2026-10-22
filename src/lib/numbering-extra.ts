import { prisma } from "@/lib/prisma";

// SC-202610-0001 ধরনের নম্বর, প্রতি মাসে নতুন করে গোনা হয় (numbering.ts-এর মতোই)
function monthPrefix(code: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${code}-${ym}-`;
}

function withCount(prefix: string, count: number): string {
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function nextStockCountNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("SC");
  const n = await prisma.stockCount.count({ where: { companyId, countNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextPackingListNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("PL");
  const n = await prisma.packingList.count({ where: { companyId, packingListNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextTransferNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("TRF");
  const n = await prisma.stockTransfer.count({ where: { companyId, transferNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextAuditNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("AUD");
  const n = await prisma.complianceAudit.count({ where: { companyId, auditNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

export async function nextLeaveNo(companyId: string): Promise<string> {
  const prefix = monthPrefix("LV");
  const n = await prisma.leaveRequest.count({ where: { companyId, requestNo: { startsWith: prefix } } });
  return withCount(prefix, n);
}

// EMP-0001: কর্মীর নম্বর মাসভিত্তিক নয়, কোম্পানিতে একটানা
export async function nextEmployeeNo(companyId: string): Promise<string> {
  const n = await prisma.employee.count({ where: { companyId } });
  return `EMP-${String(n + 1).padStart(4, "0")}`;
}

// একই transaction-এ পরপর অনেক নম্বর লাগলে: প্রথমটা থেকে শুরু করে একটা একটা করে বাড়ায়
export function numberSeries(first: string): () => string {
  const m = /^(.*?)(\d+)$/.exec(first);
  if (!m) throw new Error("Invalid number format");
  const prefix = m[1];
  const width = m[2].length;
  let n = Number(m[2]);
  return () => {
    const out = `${prefix}${String(n).padStart(width, "0")}`;
    n += 1;
    return out;
  };
}
