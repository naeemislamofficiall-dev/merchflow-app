import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason, assertSupplierActive } from "@/lib/business-rules";
import { scoreQuotations } from "@/lib/calculations";
import { nextQuotationNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { snapshotMoney } from "./currency.service";
import { BaseService } from "./base.service";

const quoteFields = {
  unitPrice: z.number().positive(),
  currency: z.string().length(3).optional(),
  leadTimeDays: z.number().int().positive().optional(),
  qualityRating: z.number().int().min(0).max(100).optional(),
  paymentTerms: z.string().max(150).optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
};

const createSchema = z.object({
  supplierId: z.string().min(1),
  materialId: z.string().min(1),
  rfqId: z.string().optional(),
  ...quoteFields,
});
const reviseSchema = z.object(quoteFields).partial();

class QuotationService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const q = found(await prisma.supplierQuotation.findUnique({ where: { id } }), "Quotation");
    await assertRecordInScope(user, q.companyId);
    return q;
  }

  // দাম বেস মুদ্রায় রেখে দেওয়া হয়, যাতে ভিন্ন মুদ্রার কোটেশন তুলনা করা যায়
  private async baseSnapshot(companyId: string, unitPrice: number, currency: string) {
    return snapshotMoney({ amount: unitPrice, currency, companyId });
  }

  async list(filter: { materialId?: string; supplierId?: string; rfqId?: string } = {}) {
    const user = await this.guard("quotation.view");
    return prisma.supplierQuotation.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.materialId ? { materialId: filter.materialId } : {}),
        ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
        ...(filter.rfqId ? { rfqId: filter.rfqId } : {}),
      },
      include: { supplier: { select: { name: true } }, material: { select: { name: true } } },
      orderBy: [{ quotationNo: "desc" }, { revisionNo: "desc" }],
    });
  }

  // Supplier-এর কাছ থেকে পাওয়া কোটেশন নথিভুক্ত করা
  async create(input: unknown) {
    const user = await this.guard("quotation.create");
    const data = createSchema.parse(input);
    const supplier = await assertSupplierActive(data.supplierId);
    if (supplier.companyId !== user.companyId) throw new BusinessRuleError("Supplier not found");
    const material = await prisma.material.findUnique({ where: { id: data.materialId } });
    if (!material || material.companyId !== user.companyId) throw new BusinessRuleError("Material not found");

    let rfqNo: string | undefined;
    if (data.rfqId) {
      const rfq = found(await prisma.rfq.findUnique({ where: { id: data.rfqId } }), "RFQ");
      if (rfq.companyId !== user.companyId) throw new BusinessRuleError("RFQ not found");
      rfqNo = rfq.rfqNo;
    }

    const currency = (data.currency ?? supplier.currency).toUpperCase();
    const snap = await this.baseSnapshot(user.companyId, data.unitPrice, currency);
    const row = await prisma.supplierQuotation.create({
      data: {
        ...data,
        currency,
        rfqNo,
        companyId: user.companyId,
        quotationNo: await nextQuotationNo(user.companyId),
        status: "RECEIVED",
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseUnitPrice: snap.baseAmount,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "SupplierQuotation", entityId: row.id, after: row });
    return row;
  }

  // ইতিহাস রাখা হয়: সংশোধিত দাম নতুন revision সারি, পুরনোটা যেমন ছিল তেমনই থাকে
  async revise(quotationId: string, input: unknown) {
    const user = await this.guard("quotation.edit");
    const patch = reviseSchema.parse(input);
    const old = await this.load(user, quotationId);
    if (old.status === "APPROVED" || old.status === "REJECTED") {
      throw new BusinessRuleError("This quotation is already decided");
    }
    const latest = await prisma.supplierQuotation.findFirst({
      where: { companyId: old.companyId, quotationNo: old.quotationNo },
      orderBy: { revisionNo: "desc" },
    });

    const unitPrice = patch.unitPrice ?? Number(old.unitPrice);
    const currency = (patch.currency ?? old.currency).toUpperCase();
    const snap = await this.baseSnapshot(old.companyId, unitPrice, currency);
    const row = await prisma.supplierQuotation.create({
      data: {
        companyId: old.companyId,
        quotationNo: old.quotationNo,
        revisionNo: (latest?.revisionNo ?? old.revisionNo) + 1,
        rfqNo: old.rfqNo,
        rfqId: old.rfqId,
        supplierId: old.supplierId,
        materialId: old.materialId,
        unitPrice,
        currency,
        leadTimeDays: patch.leadTimeDays ?? old.leadTimeDays,
        qualityRating: patch.qualityRating ?? old.qualityRating,
        paymentTerms: patch.paymentTerms ?? old.paymentTerms,
        validUntil: patch.validUntil ?? old.validUntil,
        notes: patch.notes ?? old.notes,
        status: "RECEIVED",
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseUnitPrice: snap.baseAmount,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "SupplierQuotation", entityId: row.id, after: row });
    return row;
  }

  // তুলনা: প্রতিটা কোটেশনের সর্বশেষ revision নিয়ে স্কোর (দাম ৫০%, লিড টাইম ২৫%, গুণমান ২৫%)
  async compare(input: { materialId: string; rfqId?: string }) {
    const user = await this.guard("quotation.view");
    const rows = await prisma.supplierQuotation.findMany({
      where: {
        ...(await listFilter(user)),
        materialId: input.materialId,
        ...(input.rfqId ? { rfqId: input.rfqId } : {}),
        status: { in: ["RECEIVED", "RECOMMENDED", "APPROVED"] },
      },
      include: { supplier: true },
      orderBy: [{ quotationNo: "asc" }, { revisionNo: "desc" }],
    });
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.quotationNo)) latest.set(r.quotationNo, r);
    const list = [...latest.values()];
    if (list.length === 0) return [];

    const scored = scoreQuotations(
      list.map((q) => ({
        id: q.id,
        unitPrice: Number(q.baseUnitPrice ?? q.unitPrice),
        leadTimeDays: Math.max(1, q.leadTimeDays ?? q.supplier.leadTimeDays ?? 30),
        qualityRating: q.qualityRating ?? 50,
      }))
    );
    await prisma.$transaction(
      scored.map((s) => prisma.supplierQuotation.update({ where: { id: s.id }, data: { score: s.score } }))
    );
    return scored.map((s) => ({ ...list.find((q) => q.id === s.id)!, score: s.score }));
  }

  async recommend(quotationId: string) {
    const user = await this.guard("quotation.edit");
    const q = await this.load(user, quotationId);
    if (q.status !== "RECEIVED") throw new BusinessRuleError("Only a received quotation can be recommended");
    const row = await prisma.supplierQuotation.update({ where: { id: quotationId }, data: { status: "RECOMMENDED" } });
    await this.audit({
      user, action: "UPDATE", entity: "SupplierQuotation", entityId: quotationId,
      before: { status: q.status }, after: { status: row.status },
    });
    return row;
  }

  // Approve করলে একই RFQ ও মালের বাকি কোটেশন Rejected হয়
  async approve(quotationId: string) {
    const user = await this.guard("quotation.approve");
    const q = await this.load(user, quotationId);
    if (q.status !== "RECOMMENDED") throw new BusinessRuleError("Recommend the quotation first");
    const row = await prisma.$transaction(async (tx) => {
      if (q.rfqId) {
        await tx.supplierQuotation.updateMany({
          where: {
            rfqId: q.rfqId,
            materialId: q.materialId,
            id: { not: quotationId },
            status: { in: ["RECEIVED", "RECOMMENDED"] },
          },
          data: { status: "REJECTED" },
        });
      }
      return tx.supplierQuotation.update({ where: { id: quotationId }, data: { status: "APPROVED" } });
    });
    await this.audit({
      user, action: "UPDATE", entity: "SupplierQuotation", entityId: quotationId,
      before: { status: q.status }, after: { status: row.status },
    });
    return row;
  }

  async reject(quotationId: string, reason: string) {
    const user = await this.guard("quotation.approve");
    assertRejectionReason(reason);
    const q = await this.load(user, quotationId);
    if (q.status === "APPROVED" || q.status === "REJECTED") {
      throw new BusinessRuleError("This quotation is already decided");
    }
    const row = await prisma.supplierQuotation.update({ where: { id: quotationId }, data: { status: "REJECTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "SupplierQuotation", entityId: quotationId,
      before: { status: q.status }, after: { status: row.status }, reason,
    });
    return row;
  }
}

export const quotationService = new QuotationService();