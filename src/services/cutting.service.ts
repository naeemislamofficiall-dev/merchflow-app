import { z } from "zod";
import type { CutPlanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { buildCode } from "@/lib/barcode";
import { grossRequirement } from "@/lib/calculations";
import { nextCutPlanNo } from "@/lib/numbering";
import { type SessionUser } from "@/lib/permissions";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertTransition, cutPlanTransitions } from "@/lib/status-rules";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";
import { inventoryService } from "./inventory.service";

const planSchema = z.object({
  productionOrderId: z.string().min(1),
  color: z.string().min(1).max(60), // স্টাইলের রঙের নাম
  materialId: z.string().min(1), // ফেব্রিক
  sizeRatio: z.record(z.string(), z.number().int().positive()), // যেমন { S: 1, M: 2, L: 1 }
  plannedPlies: z.number().int().positive(),
  fabricRequirement: z.number().positive().optional(), // না দিলে Approved BOM থেকে হিসাব
  remarks: z.string().max(500).optional(),
});

const laySchema = z.object({
  cutPlanId: z.string().min(1),
  plies: z.number().int().positive(),
  markerLength: z.number().positive().optional(),
  markerWidthCm: z.number().positive().optional(),
  markerEfficiencyPct: z.number().positive().max(100).optional(),
});

const cutSchema = z.object({
  layId: z.string().min(1),
  actualPlies: z.number().int().positive().optional(), // কম কাটা হলে আসল সংখ্যা
  fabricUsed: z.number().positive().optional(),
});

const bundleSchema = z.object({
  layId: z.string().min(1),
  bundleSize: z.number().int().positive().max(500), // এক bundle-এ সর্বোচ্চ কত পিস
  destinationLineId: z.string().min(1).optional(),
});

class CuttingService extends BaseService {
  private async loadPlan(user: SessionUser, id: string) {
    const plan = found(
      await prisma.cutPlan.findUnique({ where: { id }, include: { productionOrder: true } }),
      "Cut plan"
    );
    await assertRecordInScope(user, plan.companyId);
    assertFactoryInScope(await this.scopeOf(user), plan.productionOrder.factoryId);
    return plan;
  }

  // ---------- দেখা ----------

  async plans(filter: { productionOrderId?: string; status?: string } = {}) {
    const user = await this.guard("cutting.view");
    const scope = await this.scopeOf(user);
    return prisma.cutPlan.findMany({
      where: {
        ...(await listFilter(user)),
        productionOrder: { ...factoryWhere(scope) },
        ...(filter.productionOrderId ? { productionOrderId: filter.productionOrderId } : {}),
        ...(filter.status ? { status: filter.status as CutPlanStatus } : {}),
      },
      include: { productionOrder: { select: { productionNo: true } }, lays: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async plan(id: string) {
    const user = await this.guard("cutting.view");
    await this.loadPlan(user, id);
    return prisma.cutPlan.findUnique({
      where: { id },
      include: { productionOrder: true, lays: { orderBy: { layNo: "asc" } } },
    });
  }

  async bundles(filter: { productionOrderId?: string; cutPlanId?: string } = {}) {
    const user = await this.guard("cutting.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.bundle.findMany({
      where: {
        ...(await listFilter(user)),
        productionOrder: { ...factoryWhere(scope) },
        ...(filter.productionOrderId ? { productionOrderId: filter.productionOrderId } : {}),
        ...(filter.cutPlanId ? { cutPlanId: filter.cutPlanId } : {}),
      },
      orderBy: { bundleNo: "asc" },
    });
    return rows.map((b) => ({ ...b, code: buildCode("BUNDLE", b.bundleNo) }));
  }

  // ---------- Cut plan ----------

  async createPlan(input: unknown) {
    const user = await this.guard("cutting.create");
    const d = planSchema.parse(input);

    const po = found(await prisma.productionOrder.findUnique({ where: { id: d.productionOrderId } }), "Production order");
    if (po.companyId !== user.companyId) throw new BusinessRuleError("Production order not found");
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    if (po.status !== "RELEASED" && po.status !== "IN_PROGRESS") {
      throw new BusinessRuleError("Cut plans can be made only for a released or running production order");
    }

    // রঙ ও সাইজ স্টাইলের সাথে মিলতে হবে
    const style = found(
      await prisma.style.findUnique({ where: { id: po.styleId }, include: { colors: true, sizes: true } }),
      "Style"
    );
    if (!style.colors.some((c) => c.name === d.color)) {
      throw new BusinessRuleError(`Color "${d.color}" is not a color of this style`);
    }
    const labels = new Set(style.sizes.map((s) => s.label));
    for (const size of Object.keys(d.sizeRatio)) {
      if (!labels.has(size)) throw new BusinessRuleError(`Size "${size}" is not a size of this style`);
    }

    const mat = found(await prisma.material.findUnique({ where: { id: d.materialId } }), "Material");
    if (mat.companyId !== user.companyId) throw new BusinessRuleError("Material not found");

    const ratioSum = Object.values(d.sizeRatio).reduce((s, n) => s + n, 0);
    const plannedOutput = d.plannedPlies * ratioSum;

    // কাটার সীমা = প্রোডাকশন পরিমাণ + বাড়তি % (cutting allowance)
    const allowed = Math.floor(po.quantity * (1 + Number(po.allowancePct) / 100));
    const done = await prisma.cutPlan.aggregate({
      _sum: { plannedOutput: true },
      where: { productionOrderId: po.id, status: { not: "CANCELLED" } },
    });
    const already = done._sum.plannedOutput ?? 0;
    if (already + plannedOutput > allowed) {
      throw new BusinessRuleError(
        `Allowed cutting quantity is ${allowed}, already planned ${already}, this plan adds ${plannedOutput}`
      );
    }

    // ফেব্রিক কত লাগবে: দেওয়া না থাকলে Approved BOM-এর খরচ ও অপচয় থেকে
    let fabricRequirement = d.fabricRequirement;
    if (fabricRequirement === undefined) {
      const bom = await prisma.bom.findFirst({
        where: { styleId: po.styleId, status: "APPROVED" },
        include: { items: { where: { materialId: d.materialId } } },
      });
      const item = bom?.items[0];
      if (!item) {
        throw new BusinessRuleError("Enter the fabric requirement, or add this fabric to the approved BOM");
      }
      fabricRequirement = grossRequirement(
        { consumption: Number(item.consumption), wastagePct: Number(item.wastagePct) },
        plannedOutput
      );
    }

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:cutplan:${user.companyId}`);
      return tx.cutPlan.create({
        data: {
          companyId: user.companyId,
          cutPlanNo: await nextCutPlanNo(user.companyId),
          productionOrderId: po.id,
          color: d.color,
          materialId: d.materialId,
          sizeRatio: d.sizeRatio,
          plannedPlies: d.plannedPlies,
          plannedOutput,
          fabricRequirement,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "CutPlan", entityId: row.id, after: row });
    return row;
  }

  // Fabric Reservation: ফেব্রিক সংরক্ষণ (স্টকে থাকা মাল অন্য কাজে যাওয়া ঠেকায়)
  // এই ধাপে inventory.reserve permission-ও লাগে।
  async reserveFabric(id: string) {
    const user = await this.guard("cutting.edit");
    const plan = await this.loadPlan(user, id);
    assertTransition(cutPlanTransitions, plan.status, "FABRIC_RESERVED");

    const reservation = await inventoryService.reserve({
      materialId: plan.materialId,
      quantity: Number(plan.fabricRequirement),
      orderId: plan.productionOrder.orderId,
      reason: `Cut plan ${plan.cutPlanNo}`,
    });

    try {
      const row = await prisma.cutPlan.update({
        where: { id },
        data: { status: "FABRIC_RESERVED", reservationId: reservation.id },
      });
      await this.audit({
        user, action: "UPDATE", entity: "CutPlan", entityId: id,
        before: { status: plan.status }, after: { status: row.status },
      });
      return row;
    } catch (e) {
      await inventoryService.release(reservation.id); // আধা-কাজ ফেলে না রেখে সংরক্ষণ ছেড়ে দিই
      throw e;
    }
  }

  async cancelPlan(id: string, reason: string) {
    const user = await this.guard("cutting.edit");
    assertRejectionReason(reason);
    const plan = await this.loadPlan(user, id);
    assertTransition(cutPlanTransitions, plan.status, "CANCELLED");
    const cut = await prisma.lay.count({ where: { cutPlanId: id, status: "CUT" } });
    if (cut > 0) throw new BusinessRuleError("A cut plan with cut lays cannot be cancelled");

    if (plan.reservationId) {
      const r = await prisma.stockReservation.findUnique({ where: { id: plan.reservationId } });
      if (r?.status === "ACTIVE") await inventoryService.release(plan.reservationId);
    }
    const row = await prisma.cutPlan.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason: reason },
    });
    await this.audit({
      user, action: "UPDATE", entity: "CutPlan", entityId: id,
      before: { status: plan.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // ---------- Lay / Marker ----------

  async addLay(input: unknown) {
    const user = await this.guard("cutting.edit");
    const d = laySchema.parse(input);
    const plan = await this.loadPlan(user, d.cutPlanId);
    if (plan.status !== "FABRIC_RESERVED" && plan.status !== "CUTTING") {
      throw new BusinessRuleError("Reserve the fabric before planning lays");
    }

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `cutplan:${plan.id}`);
      const sum = await tx.lay.aggregate({
        _sum: { plies: true },
        _max: { layNo: true },
        where: { cutPlanId: plan.id },
      });
      const used = sum._sum.plies ?? 0;
      if (used + d.plies > plan.plannedPlies) {
        throw new BusinessRuleError(
          `The plan has ${plan.plannedPlies} plies, ${used} already in lays, so at most ${plan.plannedPlies - used} more`
        );
      }
      return tx.lay.create({
        data: {
          cutPlanId: plan.id,
          layNo: (sum._max.layNo ?? 0) + 1,
          plies: d.plies,
          markerLength: d.markerLength,
          markerWidthCm: d.markerWidthCm,
          markerEfficiencyPct: d.markerEfficiencyPct,
        },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "Lay", entityId: row.id, after: row });
    return row;
  }

  // Cutting: lay কাটা হয়ে গেলে এটা দিয়ে চিহ্নিত করা
  async markCut(input: unknown) {
    const user = await this.guard("cutting.cut");
    const d = cutSchema.parse(input);
    const lay = found(await prisma.lay.findUnique({ where: { id: d.layId } }), "Lay");
    const plan = await this.loadPlan(user, lay.cutPlanId);
    if (lay.status !== "PLANNED") throw new BusinessRuleError("This lay is already cut");
    if (d.actualPlies !== undefined && d.actualPlies > lay.plies) {
      throw new BusinessRuleError(`Actual plies cannot be more than the planned ${lay.plies}`);
    }

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `cutplan:${plan.id}`);
      const updated = await tx.lay.update({
        where: { id: lay.id },
        data: {
          status: "CUT",
          actualPlies: d.actualPlies ?? lay.plies,
          fabricUsed: d.fabricUsed,
          cutAt: new Date(),
          cutById: user.id,
        },
      });

      let status: string = plan.status;
      if (status === "FABRIC_RESERVED") {
        assertTransition(cutPlanTransitions, status, "CUTTING");
        status = "CUTTING";
      }
      // সব lay কাটা আর স্তর পূর্ণ হলে Cut plan সম্পন্ন
      const lays = await tx.lay.findMany({ where: { cutPlanId: plan.id } });
      const allCut = lays.every((l) => l.status === "CUT");
      const pliesDone = lays.reduce((s, l) => s + (l.actualPlies ?? l.plies), 0);
      if (status === "CUTTING" && allCut && pliesDone >= plan.plannedPlies) {
        assertTransition(cutPlanTransitions, status, "COMPLETED");
        status = "COMPLETED";
      }
      if (status !== plan.status) {
        await tx.cutPlan.update({ where: { id: plan.id }, data: { status: status as "CUTTING" | "COMPLETED" } });
      }
      return updated;
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "Lay", entityId: lay.id,
      before: { status: lay.status }, after: { status: row.status, actualPlies: row.actualPlies },
    });
    return row;
  }

  // ---------- Bundle ----------

  // কাটা lay থেকে bundle তৈরি: প্রতিটা সাইজের পিস = অনুপাত × স্তর, তারপর bundleSize করে ভাগ
  async generateBundles(input: unknown) {
    const user = await this.guard("cutting.cut");
    const d = bundleSchema.parse(input);
    const lay = found(await prisma.lay.findUnique({ where: { id: d.layId } }), "Lay");
    const plan = await this.loadPlan(user, lay.cutPlanId);
    if (lay.status !== "CUT") throw new BusinessRuleError("Mark the lay as cut before making bundles");

    if (d.destinationLineId) {
      const line = found(
        await prisma.line.findUnique({
          where: { id: d.destinationLineId },
          include: { floor: { include: { building: true } } },
        }),
        "Line"
      );
      if (line.floor.building.factoryId !== plan.productionOrder.factoryId) {
        throw new BusinessRuleError("The line does not belong to this factory");
      }
    }

    const style = found(
      await prisma.style.findUnique({ where: { id: plan.productionOrder.styleId }, include: { sizes: true } }),
      "Style"
    );
    const order = new Map(style.sizes.map((s) => [s.label, s.sortOrder]));
    const ratio = z.record(z.string(), z.number()).parse(plan.sizeRatio);
    const sizes = Object.keys(ratio).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

    const pliesCut = lay.actualPlies ?? lay.plies;
    const cutNumber = `${plan.cutPlanNo}-L${lay.layNo}`;
    const rows: {
      companyId: string; bundleNo: string; productionOrderId: string; cutPlanId: string; layId: string;
      styleId: string; color: string; size: string; quantity: number; cutNumber: string;
      destinationLineId?: string;
    }[] = [];

    for (const size of sizes) {
      let left = ratio[size] * pliesCut;
      const tag = size.replace(/[^A-Za-z0-9]/g, "");
      for (let n = 1; left > 0; n++) {
        const q = Math.min(d.bundleSize, left);
        rows.push({
          companyId: user.companyId,
          bundleNo: `${cutNumber}-${tag}-${String(n).padStart(3, "0")}`,
          productionOrderId: plan.productionOrderId,
          cutPlanId: plan.id,
          layId: lay.id,
          styleId: plan.productionOrder.styleId,
          color: plan.color,
          size,
          quantity: q,
          cutNumber,
          destinationLineId: d.destinationLineId,
        });
        left -= q;
      }
    }

    await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `lay:${lay.id}`);
      const exists = await tx.bundle.count({ where: { layId: lay.id } });
      if (exists > 0) throw new BusinessRuleError("Bundles were already made for this lay");
      await tx.bundle.createMany({ data: rows });
    }, TX_OPTIONS);

    await this.audit({
      user, action: "CREATE", entity: "Bundle", entityId: lay.id,
      after: { cutNumber, bundles: rows.length, pieces: rows.reduce((s, r) => s + r.quantity, 0) },
    });
    return rows.map((r) => ({ ...r, code: buildCode("BUNDLE", r.bundleNo) }));
  }
}

export const cuttingService = new CuttingService();