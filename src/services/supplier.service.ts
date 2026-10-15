import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { supplierScorecard } from "@/lib/calculations";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const categories = [
  "FABRIC", "YARN", "TRIMS", "ACCESSORIES", "PACKAGING", "WASHING", "PRINTING", "EMBROIDERY", "TRANSPORT",
] as const;

const supplierSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  category: z.enum(categories),
  country: z.string().max(80).optional(),
  address: z.string().max(300).optional(),
  currency: z.string().length(3).optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  paymentTerms: z.string().max(150).optional(),
  bankName: z.string().max(100).optional(),
  bankBranch: z.string().max(100).optional(),
  bankAccountName: z.string().max(100).optional(),
  bankAccountNo: z.string().max(60).optional(),
});

const contactSchema = z.object({
  supplierId: z.string().min(1),
  name: z.string().min(1).max(100),
  designation: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  isPrimary: z.boolean().optional(),
});

class SupplierService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const s = found(await prisma.supplier.findUnique({ where: { id } }), "Supplier");
    await assertRecordInScope(user, s.companyId);
    return s;
  }

  async list(filter: { category?: (typeof categories)[number]; activeOnly?: boolean } = {}) {
    const user = await this.guard("supplier.view");
    return prisma.supplier.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.activeOnly ? { status: "ACTIVE" as const } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("supplier.view");
    await this.load(user, id);
    return prisma.supplier.findUnique({ where: { id }, include: { contacts: true } });
  }

  async create(input: unknown) {
    const user = await this.guard("supplier.create");
    const data = supplierSchema.parse(input);
    const dup = await prisma.supplier.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: data.code } },
    });
    if (dup) throw new BusinessRuleError("Supplier code already exists");
    const row = await prisma.supplier.create({ data: { ...data, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Supplier", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("supplier.edit");
    const before = await this.load(user, id);
    const data = supplierSchema.partial().parse(input);
    const row = await prisma.supplier.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "Supplier", entityId: id, before, after: row });
    return row;
  }

  // নিষ্ক্রিয় করলে নতুন PO/কোটেশনে নেওয়া যায় না, পুরনো লেনদেন জোড়া থাকে (নিয়ম ১০)
  async setActive(id: string, active: boolean) {
    const user = await this.guard("supplier.edit");
    const before = await this.load(user, id);
    const row = await prisma.supplier.update({
      where: { id },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });
    await this.audit({ user, action: "UPDATE", entity: "Supplier", entityId: id, before, after: row });
    return row;
  }

  async addContact(input: unknown) {
    const user = await this.guard("supplier.edit");
    const data = contactSchema.parse(input);
    await this.load(user, data.supplierId);
    const row = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.supplierContact.updateMany({
          where: { supplierId: data.supplierId },
          data: { isPrimary: false },
        });
      }
      return tx.supplierContact.create({ data });
    });
    await this.audit({ user, action: "CREATE", entity: "SupplierContact", entityId: row.id, after: row });
    return row;
  }


    // Scorecard (সেকশন ১৫). সময়মতো ডেলিভারি %, PO সম্পূর্ণ %, লিড টাইম, আর গৃহীত মাল (Rejected রোল বাদে)।
  // Price competitiveness আর Response time পরের ধাপে যোগ হবে।
  async scorecard(supplierId: string) {
    const user = await this.guard("supplier.view");
    const supplier = await this.load(user, supplierId);

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT", "COMPLETE", "CLOSED"] },
      },
      select: { status: true, lines: { select: { receivedQty: true } } },
    });
    const followUps = await prisma.poFollowUp.findMany({
      where: { po: { supplierId }, actualReceiptDate: { not: null } },
    });

    const received = pos.reduce(
      (s, p) => s + p.lines.reduce((x, l) => x + Number(l.receivedQty), 0),
      0
    );

    // ইন্সপেকশনে Rejected রোলের পরিমাণ বাদ দিয়ে গৃহীত মাল (সেকশন ১৫, ২৩)
    const rejected = await prisma.fabricRoll.aggregate({
      _sum: { quantity: true },
      where: { supplierId, inspectionStatus: "REJECTED" },
    });
    const accepted = Math.max(received - Number(rejected._sum.quantity ?? 0), 0);

    const onTime = followUps.filter(
      (f) => f.actualReceiptDate && f.actualReceiptDate <= f.supplierPromisedDate
    ).length;

    return {
      supplierId,
      leadTimeDays: supplier.leadTimeDays,
      ...supplierScorecard({
        deliveriesTotal: followUps.length,
        deliveriesOnTime: onTime,
        receivedQty: received,
        acceptedQty: accepted,
        posTotal: pos.length,
        posCompleted: pos.filter((p) => p.status === "COMPLETE" || p.status === "CLOSED").length,
      }),
    };
  }
}

export const supplierService = new SupplierService();