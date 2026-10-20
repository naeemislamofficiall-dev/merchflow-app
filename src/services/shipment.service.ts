import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { orderStatusAfterShipment, shipmentBalance } from "@/lib/shipping-calc";
import { assertTransition, orderTransitions, shipmentTransitions } from "@/lib/status-rules";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { nextShipmentNo } from "@/lib/numbering";
import { assertApprovalAllows, assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import type { ShipmentStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";
import { finalInspectionGate } from "./aql.service";

const MODES = ["SEA", "AIR", "ROAD", "COURIER"] as const;

const detailSchema = z.object({
  mode: z.enum(MODES).optional(),
  exFactoryDate: z.coerce.date().optional(),
  plannedShipDate: z.coerce.date().optional(),
  port: z.string().max(100).optional(),
  destination: z.string().max(100).optional(),
  vesselOrFlight: z.string().max(100).optional(),
  forwarderId: z.string().optional(),
  blNo: z.string().max(60).optional(),
  invoiceNo: z.string().max(60).optional(),
  remarks: z.string().max(500).optional(),
});

const createSchema = detailSchema.extend({
  factoryId: z.string().min(1),
  buyerId: z.string().min(1),
  plannedShipDate: z.coerce.date(),
});

const forwarderSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const containerSchema = z.object({
  containerNo: z.string().min(4).max(20),
  containerType: z.string().max(20).optional(),
  sealNo: z.string().max(30).optional(),
});

const docSchema = z.object({
  shipmentId: z.string().optional(),
  orderId: z.string().optional(),
  // LC, BTB_LC, PI, COMMERCIAL_INVOICE, PACKING_LIST, EXP, SHIPPING_INSTRUCTION, FORWARDER_HANDOVER, CNF_HANDOVER ...
  docType: z.string().min(2).max(40).transform((v) => v.trim().toUpperCase()),
  docNo: z.string().max(60).optional(),
  issueDate: z.coerce.date().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  remarks: z.string().max(500).optional(),
});

const DOC_FLOW = ["DRAFT", "READY", "SUBMITTED", "HANDED_OVER"] as const;
const OPEN_FOR_CARTONS = ["DRAFT", "PLANNED", "DOCUMENTS_READY"];

class ShipmentService extends BaseService {
  private async load(id: string) {
    const user = await this.guard("shipment.view");
    const s = found(await prisma.shipment.findUnique({ where: { id } }), "Shipment");
    await assertRecordInScope(user, s.companyId);
    assertFactoryInScope(await this.scopeOf(user), s.factoryId);
    return { user, s };
  }

  // ---------- Forwarder ----------
  async listForwarders() {
    const user = await this.guard("shipment.view");
    return prisma.forwarder.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } });
  }

  async saveForwarder(input: unknown, id?: string) {
    const user = await this.guard("shipment.manage");
    const d = forwarderSchema.parse(input);
    if (id) {
      const before = found(await prisma.forwarder.findUnique({ where: { id } }), "Forwarder");
      await assertRecordInScope(user, before.companyId);
      const row = await prisma.forwarder.update({ where: { id }, data: d });
      await this.audit({ user, action: "UPDATE", entity: "Forwarder", entityId: id, before, after: row });
      return row;
    }
    const row = await prisma.forwarder.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Forwarder", entityId: row.id, after: row });
    return row;
  }

  // ---------- Shipment ----------
  async create(input: unknown) {
    const user = await this.guard("shipment.create");
    const d = createSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), d.factoryId);
    const buyer = found(await prisma.buyer.findUnique({ where: { id: d.buyerId } }), "Buyer");
    if (buyer.companyId !== user.companyId) throw new BusinessRuleError("Buyer not found");
    await this.assertForwarder(user.companyId, d.forwarderId);
    const row = await prisma.shipment.create({
      data: { ...d, companyId: user.companyId, shipmentNo: await nextShipmentNo(user.companyId), createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "Shipment", entityId: row.id, after: row });
    return row;
  }

  private async assertForwarder(companyId: string, id?: string) {
    if (!id) return;
    const f = await prisma.forwarder.findUnique({ where: { id } });
    if (!f || f.companyId !== companyId) throw new BusinessRuleError("Forwarder not found");
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("shipment.edit");
    const d = detailSchema.parse(input);
    const { s } = await this.load(id);
    if (["SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"].includes(s.status)) {
      throw new BusinessRuleError("This shipment can no longer be edited");
    }
    await this.assertForwarder(s.companyId, d.forwarderId);
    const row = await prisma.shipment.update({ where: { id }, data: d });
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, before: s, after: row });
    return row;
  }

  async list(filter: { status?: ShipmentStatus; buyerId?: string } = {}) {
    const user = await this.guard("shipment.view");
    return prisma.shipment.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(await this.scopeOf(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
      },
      include: { forwarder: true, _count: { select: { lines: true } } },
      orderBy: { plannedShipDate: "asc" },
      take: 200,
    });
  }

  async get(id: string) {
    const { s } = await this.load(id);
    const [full, cartons] = await Promise.all([
      prisma.shipment.findUnique({
        where: { id },
        include: { forwarder: true, containers: true, documents: true, lines: true },
      }),
      prisma.cartonLine.findMany({ where: { carton: { shipmentLine: { shipmentId: id } } } }),
    ]);
    const orderIds = [...new Set((await prisma.carton.findMany({ where: { shipmentLine: { shipmentId: id } }, select: { orderId: true } })).map((c) => c.orderId))];
    return { ...full!, orderIds, qty: cartons.reduce((x, l) => x + l.quantity, 0), status: s.status };
  }

    // নতুন শিপমেন্ট ফর্মের ড্রপডাউন: factory, বায়ার, ফরওয়ার্ডার
  async formOptions() {
    const user = await this.guard("shipment.create");
    const scope = await this.scopeOf(user);
    const [factories, buyers, forwarders] = await Promise.all([
      prisma.factory.findMany({
        where: { id: { in: scope.factoryIds } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.buyer.findMany({
        where: { companyId: user.companyId, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.forwarder.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ]);
    return {
      factories: factories.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` })),
      buyers: buyers.map((b) => ({ id: b.id, label: b.name })),
      forwarders: forwarders.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` })),
    };
  }

  // এই শিপমেন্টে যে কার্টনগুলো আছে
  async cartonsOf(id: string) {
    await this.load(id);
    const cartons = await prisma.carton.findMany({
      where: { shipmentLine: { shipmentId: id } },
      include: { lines: true },
      orderBy: { cartonNo: "asc" },
    });
    return cartons.map((c) => ({
      id: c.id,
      cartonNo: c.cartonNo,
      qty: c.lines.reduce((s, l) => s + l.quantity, 0),
    }));
  }

  // যোগ করা যায় এমন কার্টন: বন্ধ করা, একই factory ও বায়ার, অন্য শিপমেন্টে নেই
  async availableCartons(id: string) {
    const { s } = await this.load(id);
    const orders = await prisma.order.findMany({
      where: { companyId: s.companyId, buyerId: s.buyerId },
      select: { id: true },
    });
    const cartons = await prisma.carton.findMany({
      where: {
        companyId: s.companyId,
        factoryId: s.factoryId,
        status: "CLOSED",
        shipmentLine: null,
        orderId: { in: orders.map((o) => o.id) },
      },
      include: { lines: true },
      orderBy: { cartonNo: "asc" },
      take: 500,
    });
    return cartons.map((c) => ({
      id: c.id,
      cartonNo: c.cartonNo,
      qty: c.lines.reduce((x, l) => x + l.quantity, 0),
    }));
  }
  
  // ---------- Carton বরাদ্দ ----------
  // শুধু CLOSED carton, একই বায়ার ও factory, আর অন্য শিপমেন্টে নেই এমন (এতে packed-এর বেশি পাঠানো সম্ভবই না: নিয়ম ৫)
  async allocate(id: string, cartonIds: string[]) {
    const user = await this.guard("shipment.edit");
    const ids = z.array(z.string().min(1)).min(1).parse(cartonIds);
    const { s } = await this.load(id);
    if (!OPEN_FOR_CARTONS.includes(s.status)) throw new BusinessRuleError("Cartons can be added only before booking");

    const cartons = await prisma.carton.findMany({
      where: { id: { in: ids } },
      include: { shipmentLine: true },
    });
    if (cartons.length !== ids.length) throw new BusinessRuleError("Carton not found");
    const orders = await prisma.order.findMany({ where: { id: { in: [...new Set(cartons.map((c) => c.orderId))] } } });
    const orderById = new Map(orders.map((o) => [o.id, o]));
    for (const c of cartons) {
      if (c.companyId !== s.companyId || c.factoryId !== s.factoryId) throw new BusinessRuleError(`${c.cartonNo}: different factory`);
      if (c.status !== "CLOSED") throw new BusinessRuleError(`${c.cartonNo} must be closed first`);
      if (c.shipmentLine) throw new BusinessRuleError(`${c.cartonNo} is already in a shipment`);
      if (orderById.get(c.orderId)?.buyerId !== s.buyerId) throw new BusinessRuleError(`${c.cartonNo} belongs to another buyer`);
    }
    await prisma.shipmentLine.createMany({ data: ids.map((cartonId) => ({ shipmentId: id, cartonId })) });
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, after: { addedCartons: ids } });
    return { added: ids.length };
  }

  async deallocate(id: string, cartonId: string) {
    const user = await this.guard("shipment.edit");
    const { s } = await this.load(id);
    if (!OPEN_FOR_CARTONS.includes(s.status)) throw new BusinessRuleError("Cartons can be removed only before booking");
    const r = await prisma.shipmentLine.deleteMany({ where: { shipmentId: id, cartonId } });
    if (r.count === 0) throw new BusinessRuleError("This carton is not in the shipment");
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, after: { removedCarton: cartonId } });
    return { ok: true };
  }

  async addContainer(id: string, input: unknown) {
    const user = await this.guard("shipment.edit");
    const d = containerSchema.parse(input);
    const { s } = await this.load(id);
    if (["SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"].includes(s.status)) throw new BusinessRuleError("This shipment can no longer be edited");
    const dup = await prisma.container.findUnique({ where: { shipmentId_containerNo: { shipmentId: id, containerNo: d.containerNo } } });
    if (dup) throw new BusinessRuleError("This container is already added");
    const row = await prisma.container.create({ data: { ...d, shipmentId: id } });
    await this.audit({ user, action: "CREATE", entity: "Container", entityId: row.id, after: row });
    return row;
  }

  async removeContainer(id: string, containerId: string) {
    const user = await this.guard("shipment.edit");
    const { s } = await this.load(id);
    if (["SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"].includes(s.status)) throw new BusinessRuleError("This shipment can no longer be edited");
    const r = await prisma.container.deleteMany({ where: { id: containerId, shipmentId: id } });
    if (r.count === 0) throw new BusinessRuleError("Container not found");
    await this.audit({ user, action: "DELETE", entity: "Container", entityId: containerId });
    return { ok: true };
  }

  // ---------- অবস্থা বদল ----------
  async plan(id: string) {
    await this.load(id);
    const n = await prisma.shipmentLine.count({ where: { shipmentId: id } });
    if (n === 0) throw new BusinessRuleError("Add at least one carton before planning");
    return this.move(id, "PLANNED");
  }

  async documentsReady(id: string) {
    return this.move(id, "DOCUMENTS_READY");
  }

  // Booking: Final AQL (নিয়ম ১১) আর Shipment approval workflow (থাকলে) পার হতে হবে
  async book(id: string) {
    const { user, s } = await this.load(id);
    await assertApprovalAllows(s.companyId, "Shipment", id);
    await this.assertInspectionClear(user.companyId, id);
    return this.move(id, "BOOKED");
  }

  async ship(id: string) {
    const user = await this.guard("shipment.approve");
    const { s } = await this.load(id);
    assertTransition(shipmentTransitions, s.status, "SHIPPED");
    const orderIds = await this.assertInspectionClear(user.companyId, id);

    const row = await prisma.$transaction(async (tx) => {
      for (const oid of [...orderIds].sort()) await advisoryLock(tx, `ship-order:${oid}`);
      const lines = await tx.shipmentLine.findMany({ where: { shipmentId: id }, select: { cartonId: true } });
      if (lines.length === 0) throw new BusinessRuleError("The shipment has no cartons");
      await tx.carton.updateMany({ where: { id: { in: lines.map((l) => l.cartonId) } }, data: { status: "SHIPPED" } });

      for (const oid of orderIds) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: oid } });
        const ordered = (await tx.orderLine.aggregate({ _sum: { quantity: true }, where: { orderId: oid } }))._sum.quantity ?? 0;
        const shipped = (await tx.cartonLine.aggregate({ _sum: { quantity: true }, where: { carton: { orderId: oid, status: "SHIPPED" } } }))._sum.quantity ?? 0;
        const next = orderStatusAfterShipment(ordered, shipped);
        if (next && next !== order.status) {
          assertTransition(orderTransitions, order.status, next);
          await tx.order.update({ where: { id: oid }, data: { status: next } });
        }
      }
      return tx.shipment.update({ where: { id }, data: { status: "SHIPPED", actualShipDate: new Date() } });
    }, TX_OPTIONS);
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, before: { status: s.status }, after: { status: row.status } });
    return row;
  }

  async deliver(id: string) {
    return this.move(id, "DELIVERED", { deliveredAt: new Date() });
  }

  async close(id: string) {
    return this.move(id, "CLOSED");
  }

  // শিপ হওয়ার আগে পর্যন্ত বাতিল করা যায়; carton গুলো মুক্ত হয়ে যায়
  async cancel(id: string, reason: string) {
    const user = await this.guard("shipment.edit");
    assertRejectionReason(reason);
    const { s } = await this.load(id);
    assertTransition(shipmentTransitions, s.status, "CANCELLED");
    const row = await prisma.$transaction(async (tx) => {
      await tx.shipmentLine.deleteMany({ where: { shipmentId: id } });
      return tx.shipment.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
    });
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, before: { status: s.status }, after: { status: row.status }, reason });
    return row;
  }

  private async move(id: string, to: ShipmentStatus, extra: { deliveredAt?: Date } = {}) {
    const user = await this.guard("shipment.edit");
    const { s } = await this.load(id);
    assertTransition(shipmentTransitions, s.status, to);
    const row = await prisma.shipment.update({ where: { id }, data: { status: to, ...extra } });
    await this.audit({ user, action: "UPDATE", entity: "Shipment", entityId: id, before: { status: s.status }, after: { status: row.status } });
    return row;
  }

  // নিয়ম ১১: Final inspection ফেল থাকলে শিপমেন্ট আটকাবে (override না থাকলে)
  private async assertInspectionClear(companyId: string, shipmentId: string) {
    const cartons = await prisma.carton.findMany({ where: { shipmentLine: { shipmentId } }, select: { orderId: true } });
    const orderIds = [...new Set(cartons.map((c) => c.orderId))];
    const gate = await finalInspectionGate(companyId, orderIds);
    const bad = gate.filter((g) => g.blocked);
    if (bad.length > 0) {
      const orders = await prisma.order.findMany({ where: { id: { in: bad.map((b) => b.orderId) } }, select: { orderNo: true } });
      throw new BusinessRuleError(
        `Final inspection is not passed for ${orders.map((o) => o.orderNo).join(", ")}. An authorized override is needed`
      );
    }
    return orderIds;
  }

  // শিপমেন্টের আগে কী কী ঠিক আছে তার তালিকা
  async readiness(id: string) {
    const { user, s } = await this.load(id);
    const [cartons, containers, docs] = await Promise.all([
      prisma.carton.findMany({ where: { shipmentLine: { shipmentId: id } }, select: { orderId: true } }),
      prisma.container.count({ where: { shipmentId: id } }),
      prisma.exportDocument.findMany({ where: { shipmentId: id }, select: { docType: true, status: true } }),
    ]);
    const orderIds = [...new Set(cartons.map((c) => c.orderId))];
    const gate = await finalInspectionGate(user.companyId, orderIds);
    return {
      status: s.status,
      cartons: cartons.length,
      containers,
      documents: docs,
      inspection: gate,
      warnings: [
        ...(cartons.length === 0 ? ["No cartons"] : []),
        ...gate.filter((g) => g.result === null).map((g) => `No final inspection for order ${g.orderId}`),
        ...(!s.forwarderId ? ["No forwarder"] : []),
      ],
    };
  }

  // ---------- Shipment balance: Order Qty − Shipped Qty = Balance Qty (সেকশন ৩৯) ----------
  async balance(orderId: string) {
    const user = await this.guard("shipment.view");
    const order = found(await prisma.order.findUnique({ where: { id: orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    const [lines, shipped, packed] = await Promise.all([
      prisma.orderLine.groupBy({ by: ["styleId"], _sum: { quantity: true }, where: { orderId } }),
      prisma.cartonLine.groupBy({ by: ["styleId"], _sum: { quantity: true }, where: { carton: { orderId, status: "SHIPPED" } } }),
      prisma.cartonLine.groupBy({ by: ["styleId"], _sum: { quantity: true }, where: { carton: { orderId, status: "CLOSED" } } }),
    ]);
    const styles = await prisma.style.findMany({ where: { id: { in: lines.map((l) => l.styleId) } }, select: { id: true, styleNo: true } });
    const shippedBy = new Map(shipped.map((x) => [x.styleId, x._sum.quantity ?? 0]));
    const packedBy = new Map(packed.map((x) => [x.styleId, x._sum.quantity ?? 0]));
    const rows = lines.map((l) => ({
      styleNo: styles.find((s) => s.id === l.styleId)?.styleNo,
      packedNotShipped: packedBy.get(l.styleId) ?? 0,
      ...shipmentBalance(l._sum.quantity ?? 0, shippedBy.get(l.styleId) ?? 0),
    }));
    return {
      orderNo: order.orderNo,
      rows,
      total: shipmentBalance(
        rows.reduce((s, r) => s + r.ordered, 0),
        rows.reduce((s, r) => s + r.shipped, 0)
      ),
    };
  }

  // ---------- Export documents (সেকশন ৪০) ----------
  async listDocuments(filter: { shipmentId?: string; docType?: string } = {}) {
    const user = await this.guard("commercial.view");
    return prisma.exportDocument.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.shipmentId ? { shipmentId: filter.shipmentId } : {}),
        ...(filter.docType ? { docType: filter.docType.toUpperCase() } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async createDocument(input: unknown) {
    const user = await this.guard("commercial.create");
    const d = docSchema.parse(input);
    if (d.shipmentId) await this.load(d.shipmentId);
    if (d.orderId) {
      const o = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
      await assertRecordInScope(user, o.companyId);
    }
    const row = await prisma.exportDocument.create({ data: { ...d, companyId: user.companyId, createdById: user.id } });
    await this.audit({ user, action: "CREATE", entity: "ExportDocument", entityId: row.id, after: row });
    return row;
  }

  // DRAFT → READY → SUBMITTED → HANDED_OVER (শুধু সামনে)
  async advanceDocument(id: string, to: (typeof DOC_FLOW)[number], handover?: { handoverTo?: string; handoverDate?: Date }) {
    const user = await this.guard("commercial.edit");
    const before = found(await prisma.exportDocument.findUnique({ where: { id } }), "Document");
    await assertRecordInScope(user, before.companyId);
    if (DOC_FLOW.indexOf(to) !== DOC_FLOW.indexOf(before.status) + 1) {
      throw new BusinessRuleError(`Status change not allowed: ${before.status} → ${to}`);
    }
    if (to === "HANDED_OVER" && !handover?.handoverTo) throw new BusinessRuleError("Say who it was handed over to");
    const row = await prisma.exportDocument.update({
      where: { id },
      data: { status: to, ...(to === "HANDED_OVER" ? { handoverTo: handover!.handoverTo, handoverDate: handover?.handoverDate ?? new Date() } : {}) },
    });
    await this.audit({ user, action: "UPDATE", entity: "ExportDocument", entityId: id, before: { status: before.status }, after: { status: row.status } });
    return row;
  }
}

export const shipmentService = new ShipmentService();