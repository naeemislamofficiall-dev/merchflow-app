import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertFactoryInScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/permissions";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";

const buyerSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  country: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  address: z.string().max(300).optional(),
  currency: z.string().length(3).optional(),
  paymentTerms: z.string().max(150).optional(),
  shipmentTerms: z.string().max(150).optional(),
  category: z.string().max(80).optional(),
  complianceNotes: z.string().max(1000).optional(),
});

const contactSchema = z.object({
  buyerId: z.string().min(1),
  name: z.string().min(1).max(100),
  designation: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  isPrimary: z.boolean().optional(),
});

const configSchema = z.object({
  buyerId: z.string().min(1),
  sizeSystem: z.string().max(100).optional(),
  colorCoding: z.string().max(100).optional(),
  labelRequirements: z.string().max(1000).optional(),
  packingRules: z.string().max(1000).optional(),
  aqlStandard: z.string().max(100).optional(),
  inspectionRequirements: z.string().max(1000).optional(),
  documentRequirements: z.string().max(1000).optional(),
  approvalWorkflow: z.string().max(300).optional(),
  shipmentTolerancePct: z.number().min(0).max(100).optional(),
});

class BuyerService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const buyer = found(await prisma.buyer.findUnique({ where: { id } }), "Buyer");
    await assertRecordInScope(user, buyer.companyId);
    return buyer;
  }

  async list(activeOnly = false) {
    const user = await this.guard("buyer.view");
    return prisma.buyer.findMany({
      where: {
        ...(await listFilter(user)),
        ...(activeOnly ? { status: "ACTIVE" as const } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("buyer.view");
    await this.load(user, id);
    return prisma.buyer.findUnique({
      where: { id },
      include: {
        contacts: true,
        config: true,
        preferredFactories: { include: { factory: true } },
      },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("buyer.create");
    const data = buyerSchema.parse(input);
    const dup = await prisma.buyer.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: data.code } },
    });
    if (dup) throw new BusinessRuleError("Buyer code already exists");
    const row = await prisma.buyer.create({ data: { ...data, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Buyer", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("buyer.edit");
    const before = await this.load(user, id);
    const data = buyerSchema.partial().parse(input);
    const row = await prisma.buyer.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "Buyer", entityId: id, before, after: row });
    return row;
  }

  // নিষ্ক্রিয় করলেও পুরনো লেনদেন buyer-এর সাথে জোড়া থাকে (নিয়ম ১০)
  async setActive(id: string, active: boolean) {
    const user = await this.guard("buyer.edit");
    const before = await this.load(user, id);
    const row = await prisma.buyer.update({
      where: { id },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });
    await this.audit({ user, action: "UPDATE", entity: "Buyer", entityId: id, before, after: row });
    return row;
  }

  async addContact(input: unknown) {
    const user = await this.guard("buyer.edit");
    const data = contactSchema.parse(input);
    await this.load(user, data.buyerId);
    const row = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.buyerContact.updateMany({
          where: { buyerId: data.buyerId },
          data: { isPrimary: false },
        });
      }
      return tx.buyerContact.create({ data });
    });
    await this.audit({ user, action: "CREATE", entity: "BuyerContact", entityId: row.id, after: row });
    return row;
  }

  // বায়ার-ভিত্তিক সেটিং: size system, AQL, label, packing ইত্যাদি
  async saveConfig(input: unknown) {
    const user = await this.guard("buyer.edit");
    const { buyerId, ...rest } = configSchema.parse(input);
    await this.load(user, buyerId);
    const row = await prisma.buyerConfig.upsert({
      where: { buyerId },
      update: rest,
      create: { buyerId, ...rest },
    });
    await this.audit({ user, action: "UPDATE", entity: "BuyerConfig", entityId: row.id, after: row });
    return row;
  }

  async setPreferredFactories(buyerId: string, factoryIds: string[]) {
    const user = await this.guard("buyer.edit");
    await this.load(user, buyerId);
    const scope = await this.scopeOf(user);
    const ids = [...new Set(factoryIds)];
    for (const f of ids) assertFactoryInScope(scope, f);
    await prisma.$transaction([
      prisma.buyerPreferredFactory.deleteMany({ where: { buyerId } }),
      prisma.buyerPreferredFactory.createMany({
        data: ids.map((factoryId) => ({ buyerId, factoryId })),
      }),
    ]);
    await this.audit({
      user, action: "UPDATE", entity: "BuyerPreferredFactory", entityId: buyerId, after: { factoryIds: ids },
    });
    return ids;
  }

  // Buyer dashboard (সেকশন ৬): যেগুলোর তথ্য এখন আছে।
  // Late styles, claims, profitability, on-time shipment % আসবে Production/Shipment-এর পর।
  async summary(id: string) {
    const user = await this.guard("buyer.view");
    const buyer = await this.load(user, id);
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 86_400_000);

    const orders = await prisma.order.findMany({
      where: { buyerId: id, status: { in: ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"] } },
      include: { lines: true },
    });
    let units = 0;
    let value = 0;
    for (const o of orders) {
      for (const l of o.lines) {
        units += l.quantity;
        value += l.quantity * Number(l.unitPrice);
      }
    }
    const upcomingShipments = orders.filter(
      (o) => o.shipDate && o.shipDate >= now && o.shipDate <= soon
    ).length;
    const openSamples = await prisma.sampleRequest.count({
      where: {
        style: { buyerId: id },
        status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
    });

    return {
      buyerId: buyer.id,
      activeOrders: orders.length,
      totalOrderValue: value, // প্রতিটা অর্ডারের নিজস্ব মুদ্রায় যোগফল (সাধারণত buyer-এর মুদ্রা)
      currency: buyer.currency,
      units,
      upcomingShipments30d: upcomingShipments,
      openSamples,
    };
  }
}

export const buyerService = new BuyerService();