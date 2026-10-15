import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ProductionStatus } from "@/generated/prisma/enums";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { overlap, workingDaysBetween } from "@/lib/ie-calc";
import { nextProductionNo } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { can, type SessionUser } from "@/lib/permissions";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, daysBetween, found, listFilter, startOfDay } from "@/lib/service-helpers";
import { assertTransition, orderTransitions, productionTransitions } from "@/lib/status-rules";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";

const OPEN = ["PLANNED", "RELEASED", "IN_PROGRESS", "PAUSED"] as const;

const createSchema = z.object({
  factoryId: z.string().min(1),
  orderId: z.string().min(1),
  styleId: z.string().min(1),
  quantity: z.number().int().positive(),
  routeId: z.string().min(1),
  lineId: z.string().min(1).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priority: z.number().int().min(1).max(5).optional(), // না দিলে ৩
  allowancePct: z.number().min(0).max(20).optional(), // কাটার বাড়তি %, না দিলে ০
  remarks: z.string().max(500).optional(),
});

const updateSchema = z
  .object({
    quantity: z.number().int().positive(),
    routeId: z.string().min(1),
    allowancePct: z.number().min(0).max(20),
    lineId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    priority: z.number().int().min(1).max(5),
    remarks: z.string().max(500),
  })
  .partial();

const completeSchema = z.object({
  completedQty: z.number().int().nonnegative(),
  overReason: z.string().max(300).optional(),
});

const capacitySchema = z.object({
  factoryId: z.string().min(1),
  from: z.coerce.date(),
  to: z.coerce.date(),
  weekendDays: z.array(z.number().int().min(0).max(6)).optional(), // 0 = রবি ... 6 = শনি, না দিলে শুক্রবার বন্ধ
});

class ProductionOrderService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const po = found(await prisma.productionOrder.findUnique({ where: { id } }), "Production order");
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    return po;
  }

  // লাইনটা এই factory-র কিনা (Line → Floor → Building → Factory)
  private async assertLineInFactory(lineId: string, factoryId: string) {
    const line = found(
      await prisma.line.findUnique({
        where: { id: lineId },
        include: { floor: { include: { building: true } } },
      }),
      "Line"
    );
    if (!line.isActive || line.floor.building.factoryId !== factoryId) {
      throw new BusinessRuleError("This line does not belong to the selected factory");
    }
  }

  private async orderQtyForStyle(orderId: string, styleId: string) {
    const r = await prisma.orderLine.aggregate({ _sum: { quantity: true }, where: { orderId, styleId } });
    return r._sum.quantity ?? 0;
  }

  // অর্ডারের পরিমাণের বেশি প্রোডাকশন প্ল্যান করা যাবে না
  private async assertWithinOrder(orderId: string, styleId: string, qty: number, excludeId?: string) {
    const orderQty = await this.orderQtyForStyle(orderId, styleId);
    if (orderQty === 0) throw new BusinessRuleError("This style is not part of the order");
    const r = await prisma.productionOrder.aggregate({
      _sum: { quantity: true },
      where: { orderId, styleId, status: { not: "CANCELLED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    const planned = r._sum.quantity ?? 0;
    if (planned + qty > orderQty) {
      throw new BusinessRuleError(
        `Order quantity is ${orderQty}, already planned ${planned}, so at most ${Math.max(orderQty - planned, 0)} more can be planned`
      );
    }
  }

  // ---------- দেখা ----------

  async list(filter: { status?: string; orderId?: string; factoryId?: string } = {}) {
    const user = await this.guard("production.view");
    const scope = await this.scopeOf(user);
    return prisma.productionOrder.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(scope),
        ...(filter.status ? { status: filter.status as ProductionStatus } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
        ...(filter.factoryId ? { factoryId: filter.factoryId } : {}),
      },
      include: {
        style: { select: { styleNo: true, name: true } },
        order: { select: { orderNo: true } },
        factory: { select: { code: true, name: true } },
        line: { select: { code: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { startDate: "asc" }],
    });
  }

  async get(id: string) {
    const user = await this.guard("production.view");
    await this.load(user, id);
    const row = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        style: true,
        order: true,
        factory: true,
        line: true,
        route: { include: { steps: { orderBy: { seq: "asc" } } } },
      },
    });
    const cut = await prisma.cutPlan.aggregate({
      _sum: { plannedOutput: true },
      _count: true,
      where: { productionOrderId: id, status: { not: "CANCELLED" } },
    });
    return { ...row!, cutPlanCount: cut._count, cutPlannedOutput: cut._sum.plannedOutput ?? 0 };
  }

  // ---------- তৈরি ও বদল ----------

  async create(input: unknown) {
    const user = await this.guard("production.create");
    const d = createSchema.parse(input);
    if (d.endDate < d.startDate) throw new BusinessRuleError("End date cannot be before start date");

    const factory = found(await prisma.factory.findUnique({ where: { id: d.factoryId } }), "Factory");
    if (factory.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
    assertFactoryInScope(await this.scopeOf(user), factory.id);

    const order = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
    if (order.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    if (order.status !== "CONFIRMED" && order.status !== "IN_PRODUCTION") {
      throw new BusinessRuleError("Production can be planned only for a confirmed order");
    }

    const route = found(await prisma.productionRoute.findUnique({ where: { id: d.routeId } }), "Route");
    if (route.companyId !== user.companyId || !route.isActive) throw new BusinessRuleError("Route not found");
    if (d.lineId) await this.assertLineInFactory(d.lineId, d.factoryId);

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:production:${user.companyId}`);
      await advisoryLock(tx, `prodcap:${d.orderId}:${d.styleId}`);
      await this.assertWithinOrder(d.orderId, d.styleId, d.quantity);
      return tx.productionOrder.create({
        data: {
          companyId: user.companyId,
          factoryId: d.factoryId,
          productionNo: await nextProductionNo(user.companyId),
          orderId: d.orderId,
          styleId: d.styleId,
          quantity: d.quantity,
          routeId: d.routeId,
          lineId: d.lineId,
          startDate: d.startDate,
          endDate: d.endDate,
          priority: d.priority,
          allowancePct: d.allowancePct,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "ProductionOrder", entityId: row.id, after: row });
    return row;
  }

  // PLANNED অবস্থায় সব বদলানো যায়। শুরু হয়ে গেলে শুধু সময়সূচি, লাইন, priority, মন্তব্য।
  async update(id: string, input: unknown) {
    const user = await this.guard("production.edit");
    const d = updateSchema.parse(input);
    const po = await this.load(user, id);

    if (po.status === "COMPLETED" || po.status === "CLOSED" || po.status === "CANCELLED") {
      throw new BusinessRuleError("A finished or cancelled production order cannot be edited");
    }
    const structural = d.quantity !== undefined || d.routeId !== undefined || d.allowancePct !== undefined;
    if (structural && po.status !== "PLANNED") {
      throw new BusinessRuleError("Quantity, route and allowance can change only while the order is Planned");
    }

    const start = d.startDate ?? po.startDate;
    const end = d.endDate ?? po.endDate;
    if (end < start) throw new BusinessRuleError("End date cannot be before start date");
    if (d.lineId) await this.assertLineInFactory(d.lineId, po.factoryId);
    if (d.routeId) {
      const route = found(await prisma.productionRoute.findUnique({ where: { id: d.routeId } }), "Route");
      if (route.companyId !== user.companyId || !route.isActive) throw new BusinessRuleError("Route not found");
    }

    const row = await prisma.$transaction(async (tx) => {
      if (d.quantity !== undefined) {
        await advisoryLock(tx, `prodcap:${po.orderId}:${po.styleId}`);
        await this.assertWithinOrder(po.orderId, po.styleId, d.quantity, po.id);
      }
      return tx.productionOrder.update({ where: { id }, data: d });
    }, TX_OPTIONS);

    await this.audit({ user, action: "UPDATE", entity: "ProductionOrder", entityId: id, before: po, after: row });
    return row;
  }

  // ---------- অবস্থা বদল (স্পেক ৫৮: Planned → Released → In Progress → Paused → Completed → Closed) ----------

  // Release: অর্ডার Confirmed থাকলে In Production হয়ে যায়
  async release(id: string) {
    const user = await this.guard("production.release");
    const po = await this.load(user, id);
    assertTransition(productionTransitions, po.status, "RELEASED");

    const row = await prisma.$transaction(async (tx) => {
      const order = found(await tx.order.findUnique({ where: { id: po.orderId } }), "Order");
      if (order.status === "CONFIRMED") {
        assertTransition(orderTransitions, order.status, "IN_PRODUCTION");
        await tx.order.update({ where: { id: order.id }, data: { status: "IN_PRODUCTION" } });
      } else if (order.status !== "IN_PRODUCTION") {
        throw new BusinessRuleError("The order is not active, so production cannot be released");
      }
      return tx.productionOrder.update({ where: { id }, data: { status: "RELEASED", releasedAt: new Date() } });
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "ProductionOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status },
    });
    return row;
  }

  async start(id: string) {
    return this.move(id, "IN_PROGRESS", "production.edit", { startedAt: new Date() });
  }

  async pause(id: string, reason: string) {
    assertRejectionReason(reason);
    return this.move(id, "PAUSED", "production.edit", { pauseReason: reason }, reason);
  }

  async resume(id: string) {
    return this.move(id, "IN_PROGRESS", "production.edit", { pauseReason: null });
  }

  // নিয়ম ৬: Released পরিমাণের বেশি শেষ করতে production.overproduce permission ও কারণ লাগে
  async complete(id: string, input: unknown) {
    const user = await this.guard("production.complete");
    const d = completeSchema.parse(input);
    const po = await this.load(user, id);
    assertTransition(productionTransitions, po.status, "COMPLETED");

    let overReason: string | undefined;
    if (d.completedQty > po.quantity) {
      if (!can(user, "production.overproduce")) {
        throw new BusinessRuleError(
          `Completed quantity ${d.completedQty} is more than the order quantity ${po.quantity}. Overproduction needs authorization`
        );
      }
      if (!d.overReason || d.overReason.trim().length < 3) {
        throw new BusinessRuleError("A reason is required for overproduction");
      }
      overReason = d.overReason;
    }

    const row = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedQty: d.completedQty,
        completedAt: new Date(),
        overproductionReason: overReason,
        pauseReason: null,
      },
    });
    await this.audit({
      user, action: "UPDATE", entity: "ProductionOrder", entityId: id,
      before: { status: po.status, completedQty: po.completedQty },
      after: { status: row.status, completedQty: row.completedQty },
      reason: overReason,
    });
    return row;
  }

  async close(id: string) {
    return this.move(id, "CLOSED", "production.complete", { closedAt: new Date() });
  }

  // শুরুর আগে পর্যন্ত বাতিল করা যায়। Cut plan থাকলে আগে সেগুলো বাতিল করতে হবে।
  async cancel(id: string, reason: string) {
    const user = await this.guard("production.edit");
    assertRejectionReason(reason);
    const po = await this.load(user, id);
    assertTransition(productionTransitions, po.status, "CANCELLED");
    const plans = await prisma.cutPlan.count({
      where: { productionOrderId: id, status: { not: "CANCELLED" } },
    });
    if (plans > 0) throw new BusinessRuleError("Cancel the cut plans of this production order first");

    const row = await prisma.productionOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "ProductionOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  private async move(
    id: string,
    to: "IN_PROGRESS" | "PAUSED" | "CLOSED",
    permission: string,
    data: Prisma.ProductionOrderUncheckedUpdateInput,
    reason?: string
  ) {
    const user = await this.guard(permission);
    const po = await this.load(user, id);
    assertTransition(productionTransitions, po.status, to);
    const row = await prisma.productionOrder.update({ where: { id }, data: { status: to, ...data } });
    await this.audit({
      user, action: "UPDATE", entity: "ProductionOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // ---------- Capacity planning (সেকশন ২৫) ----------
  // Available = কর্মদিবস × লাইনের মিনিট × অপারেটর × দক্ষতা%
  // Required  = চলমান কাজের বাকি পিস × স্টাইলের SMV (সময়সীমার অংশ ধরে)
  // Planned   = Required-এর যে অংশ কোনো লাইনে বসানো আছে
  // Gap       = Available − Required (ঋণাত্মক হলে ক্ষমতার ঘাটতি)
  async capacity(input: unknown) {
    const user = await this.guard("production.view");
    const d = capacitySchema.parse(input);
    const from = startOfDay(d.from);
    const to = startOfDay(d.to);
    if (to < from) throw new BusinessRuleError("The end date cannot be before the start date");
    if (daysBetween(from, to) > 366) throw new BusinessRuleError("Please choose a range of at most one year");

    const factory = found(await prisma.factory.findUnique({ where: { id: d.factoryId } }), "Factory");
    if (factory.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
    assertFactoryInScope(await this.scopeOf(user), factory.id);

    const weekend = d.weekendDays ?? [5];
    const days = workingDaysBetween(from, to, weekend);

    const lines = await prisma.line.findMany({
      where: { isActive: true, floor: { building: { factoryId: d.factoryId } } },
      select: { id: true, code: true, name: true, operators: true, efficiencyPct: true, minutesPerDay: true },
      orderBy: { code: "asc" },
    });

    const orders = await prisma.productionOrder.findMany({
      where: {
        companyId: user.companyId,
        factoryId: d.factoryId,
        status: { in: [...OPEN] },
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: { style: { select: { styleNo: true } } },
    });

    const sams = await prisma.productionOperation.groupBy({
      by: ["styleId"],
      where: { styleId: { in: [...new Set(orders.map((o) => o.styleId))] } },
      _sum: { smv: true },
    });
    const samByStyle = new Map(sams.map((s) => [s.styleId, Number(s._sum.smv ?? 0)]));

    let required = 0;
    let planned = 0;
    const plannedByLine = new Map<string, number>();
    const missingSam: { productionNo: string; styleNo: string }[] = [];

    for (const o of orders) {
      const sam = samByStyle.get(o.styleId);
      if (!sam) {
        missingSam.push({ productionNo: o.productionNo, styleNo: o.style.styleNo });
        continue;
      }
      const os = startOfDay(o.startDate);
      const oe = startOfDay(o.endDate);
      const total = workingDaysBetween(os, oe, weekend);
      const ov = overlap(os, oe, from, to);
      const inRange = ov ? workingDaysBetween(ov.from, ov.to, weekend) : 0;
      const share = total > 0 ? inRange / total : 0;
      const minutes = Math.max(o.quantity - o.completedQty, 0) * sam * share;
      required += minutes;
      if (o.lineId) {
        planned += minutes;
        plannedByLine.set(o.lineId, (plannedByLine.get(o.lineId) ?? 0) + minutes);
      }
    }

    const lineRows = lines.map((l) => {
      const missingData = l.operators === null;
      const available = missingData
        ? 0
        : days * l.minutesPerDay * (l.operators ?? 0) * (Number(l.efficiencyPct ?? 100) / 100);
      const p = plannedByLine.get(l.id) ?? 0;
      return {
        lineId: l.id,
        code: l.code,
        name: l.name,
        availableMinutes: Math.round(available),
        plannedMinutes: Math.round(p),
        utilizationPct: available > 0 ? Math.round((p / available) * 1000) / 10 : null,
        missingData, // operators দেওয়া নেই
      };
    });
    const available = lineRows.reduce((s, l) => s + l.availableMinutes, 0);

    return {
      factoryId: d.factoryId,
      from, to,
      workingDays: days,
      availableMinutes: available,
      requiredMinutes: Math.round(required),
      plannedMinutes: Math.round(planned),
      unplannedMinutes: Math.round(required - planned),
      gapMinutes: Math.round(available - required),
      lines: lineRows,
      missingSam, // এই কাজগুলোর স্টাইলে Operation Bulletin নেই, তাই গোনা হয়নি
    };
  }
}

export const productionOrderService = new ProductionOrderService();