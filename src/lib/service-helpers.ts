import { prisma } from "@/lib/prisma";
import { assertCompanyInScope, companyWhere, resolveScope } from "@/lib/scope";
import { BusinessRuleError } from "@/lib/business-rules";
import type { SessionUser } from "@/lib/permissions";

// record না পেলে এরর, পেলে সেটাই ফেরত দেয়
export function found<T>(row: T | null | undefined, label: string): T {
  if (!row) throw new BusinessRuleError(`${label} not found`);
  return row;
}

// list query-র where-এ ছড়িয়ে দাও: ইউজার যে company-গুলো দেখতে পারে শুধু সেগুলো
export async function listFilter(user: SessionUser) {
  return companyWhere(await resolveScope(user.id));
}

// অন্য company-র record-এ হাত দিলে এরর (IDOR সুরক্ষা)
export async function assertRecordInScope(user: SessionUser, companyId: string) {
  assertCompanyInScope(await resolveScope(user.id), companyId);
}

// ---------- Approval engine-এর সাথে যোগ ----------

// এই ধরনের record-এর জন্য কোনো সক্রিয় approval workflow আছে কিনা
export async function approvalNeeded(companyId: string, entityType: string) {
  const n = await prisma.workflow.count({
    where: { companyId, entityType, isActive: true },
  });
  return n > 0;
}

// workflow থাকলে শেষ অনুরোধটা APPROVED না হওয়া পর্যন্ত চূড়ান্ত approve আটকে রাখে
export async function assertApprovalAllows(
  companyId: string,
  entityType: string,
  entityId: string
) {
  if (!(await approvalNeeded(companyId, entityType))) return;
  const last = await prisma.approvalRequest.findFirst({
    where: { companyId, entityType, entityId },
    orderBy: { requestedAt: "desc" },
  });
  if (!last || last.status !== "APPROVED") {
    throw new BusinessRuleError("The approval request must be approved first");
  }
}

// ---------- তারিখ ----------

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}