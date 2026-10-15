import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertBuyerActive } from "@/lib/business-rules";
import { assertTransition, enquiryTransitions } from "@/lib/status-rules";
import { nextEnquiryNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { EnquiryStatus } from "@/generated/prisma/enums";
import { orderService } from "./order.service";
import { BaseService } from "./base.service";

const itemSchema = z.object({
  styleId: z.string().optional(),
  description: z.string().min(1).max(300),
  quantity: z.number().int().positive(),
  targetPrice: z.number().nonnegative().optional(),
});

const headerSchema = z.object({
  currency: z.string().length(3).optional(),
  receivedDate: z.coerce.date().optional(),
  requiredShipDate: z.coerce.date().optional(),
  fabric: z.string().max(200).optional(),
  productType: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const createSchema = headerSchema.extend({
  buyerId: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

const negotiationSchema = z.object({
  enquiryId: z.string().min(1),
  initialQuotedPrice: z.number().nonnegative().optional(),
  buyerTarget: z.number().nonnegative().optional(),
  revisedPrice: z.number().nonnegative().optional(),
  reason: z.string().max(500).optional(),
});

const convertSchema = z.object({
  buyerPoNo: z.string().max(60).optional(),
  seasonId: z.string().optional(),
  shipDate: z.coerce.date().optional(),
  // কোন enquiry item কত দামে (item id → দাম)। না দিলে target price ধরা হয়।
  prices: z.record(z.string(), z.number().nonnegative()).optional(),
});

class EnquiryService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const enq = found(await prisma.enquiry.findUnique({ where: { id } }), "Enquiry");
    await assertRecordInScope(user, enq.companyId);
    return enq;
  }

  async list(filter: { buyerId?: string; status?: EnquiryStatus } = {}) {
    const user = await this.guard("enquiry.view");
    return prisma.enquiry.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { buyer: { select: { name: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("enquiry.view");
    await this.load(user, id);
    return prisma.enquiry.findUnique({
      where: { id },
      include: {
        buyer: true,
        items: true,
        negotiations: { orderBy: { negotiatedAt: "desc" } },
      },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("enquiry.create");
    const data = createSchema.parse(input);
    const buyer = await assertBuyerActive(data.buyerId);
    if (buyer.companyId !== user.companyId) throw new BusinessRuleError("Buyer not found");

    for (const it of data.items) {
      if (!it.styleId) continue;
      const s = found(await prisma.style.findUnique({ where: { id: it.styleId } }), "Style");
      if (s.companyId !== user.companyId || s.buyerId !== data.buyerId) {
        throw new BusinessRuleError("Style does not belong to this buyer");
      }
    }
    const { items, ...header } = data;
    const row = await prisma.enquiry.create({
      data: {
        ...header,
        companyId: user.companyId,
        enquiryNo: await nextEnquiryNo(user.companyId),
        createdById: user.id,
        items: { create: items },
      },
      include: { items: true },
    });
    await this.audit({ user, action: "CREATE", entity: "Enquiry", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("enquiry.edit");
    const before = await this.load(user, id);
    if (before.status === "CONVERTED" || before.status === "CANCELLED") {
      throw new BusinessRuleError("This enquiry can no longer be edited");
    }
    const data = headerSchema.partial().parse(input);
    const row = await prisma.enquiry.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "Enquiry", entityId: id, before, after: row });
    return row;
  }

  // Enquiry → Costing → Negotiation → Quotation → Approval (CONVERTED শুধু convertToOrder দিয়ে)
  async changeStatus(id: string, to: EnquiryStatus) {
    const user = await this.guard("enquiry.edit");
    if (to === "APPROVED") await this.guard("enquiry.approve");
    if (to === "CONVERTED") throw new BusinessRuleError("Use convertToOrder()");
    const enq = await this.load(user, id);
    assertTransition(enquiryTransitions, enq.status, to);
    const row = await prisma.enquiry.update({ where: { id }, data: { status: to } });
    await this.audit({
      user, action: "UPDATE", entity: "Enquiry", entityId: id,
      before: { status: enq.status }, after: { status: row.status },
    });
    return row;
  }

  // দরদামের ইতিহাস: প্রথম দর, বায়ারের টার্গেট, সংশোধিত দর, কারণ, কে, কখন
  async addNegotiation(input: unknown) {
    const user = await this.guard("enquiry.edit");
    const data = negotiationSchema.parse(input);
    const enq = await this.load(user, data.enquiryId);
    if (enq.status === "CONVERTED" || enq.status === "CANCELLED") {
      throw new BusinessRuleError("This enquiry is closed");
    }
    const row = await prisma.enquiryNegotiation.create({
      data: { ...data, negotiatedById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "EnquiryNegotiation", entityId: row.id, after: row });
    return row;
  }

  // Approved enquiry থেকে অর্ডার (সব item-এ style থাকতে হবে)
  async convertToOrder(id: string, input: unknown = {}) {
    const user = await this.guard("enquiry.edit");
    const data = convertSchema.parse(input);
    const enq = found(
      await prisma.enquiry.findUnique({ where: { id }, include: { items: true } }),
      "Enquiry"
    );
    await assertRecordInScope(user, enq.companyId);
    if (enq.status !== "APPROVED") {
      throw new BusinessRuleError("Only an approved enquiry can become an order");
    }
    if (enq.items.some((i) => !i.styleId)) {
      throw new BusinessRuleError("Link a style to every enquiry item first");
    }
    return orderService.create({
      buyerId: enq.buyerId,
      currency: enq.currency,
      buyerPoNo: data.buyerPoNo,
      seasonId: data.seasonId,
      shipDate: data.shipDate ?? enq.requiredShipDate ?? undefined,
      sourceEnquiryId: enq.id,
      lines: enq.items.map((i) => ({
        styleId: i.styleId as string,
        quantity: i.quantity,
        unitPrice: data.prices?.[i.id] ?? (i.targetPrice === null ? 0 : Number(i.targetPrice)),
      })),
    });
  }
}

export const enquiryService = new EnquiryService();