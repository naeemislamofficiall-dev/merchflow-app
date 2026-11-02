import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { nextDyeNo, nextFinishingNo, nextKnittingNo, nextLabDipNo } from "@/lib/numbering";
import {
  assertTransition,
  dyeBatchTransitions,
  fabricFinishingTransitions,
  knittingTransitions,
  labDipTransitions,
} from "@/lib/status-rules";
import { EPS, TX_OPTIONS, advisoryLock, loadWarehouse, onHand, postProducedRoll, postStockTx } from "@/lib/stock";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertTextileFactory, isTextileEnabled, isTextileType } from "@/lib/textile-flag";
import {
  canStartBulkDyeing,
  knittingOutputOk,
  nextResubmissionCount,
  nextSubmissionRound,
  outputWithinInput,
  yarnRequired,
} from "@/lib/textile-calc";
import { BaseService } from "./base.service";
import { toDateOnly } from "./currency.service";

const today = () => toDateOnly(new Date());

const yarnSchema = z.object({
  lotId: z.string().min(1),
  yarnType: z.string().min(1).max(60),
  yarnCount: z.string().min(1).max(30),
  composition: z.string().max(120).optional(),
  color: z.string().max(60).optional(),
  rate: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

const labDipSchema = z.object({
  factoryId: z.string().min(1),
  buyerId: z.string().min(1),
  styleId: z.string().optional(),
  orderId: z.string().optional(),
  color: z.string().min(1).max(60),
  standardRef: z.string().min(1).max(120),
  remarks: z.string().max(500).optional(),
});

const knitSchema = z.object({
  factoryId: z.string().min(1),
  machineNo: z.string().min(1).max(40),
  program: z.string().max(120).optional(),
  orderId: z.string().optional(),
  yarnLotId: z.string().min(1),
  greigeMaterialId: z.string().min(1),
  warehouseId: z.string().min(1),
  plannedQty: z.number().positive(),
  wastagePct: z.number().min(0).max(50).default(3),
  productionDate: z.coerce.date().optional(),
  remarks: z.string().max(500).optional(),
});

const rollIn = z.object({
  quantity: z.number().positive(),
  gsm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
});

const knitCompleteSchema = z.object({
  id: z.string().min(1),
  rejectQty: z.number().nonnegative().default(0),
  rolls: z.array(rollIn).min(1),
});

const dyeSchema = z.object({
  factoryId: z.string().min(1),
  labDipId: z.string().min(1),
  greigeRollId: z.string().min(1),
  dyedMaterialId: z.string().min(1),
  dyeLot: z.string().min(1).max(60),
  batchNo: z.string().min(1).max(60),
  color: z.string().max(60).optional(),
  recipe: z.string().max(500).optional(),
  inputQty: z.number().positive(),
  chemicals: z
    .array(z.object({ name: z.string().min(1), qty: z.number().nonnegative(), unit: z.string().max(10) }))
    .optional(),
  remarks: z.string().max(500).optional(),
});

const dyeCompleteSchema = z.object({
  id: z.string().min(1),
  outputQty: z.number().positive(),
  rejectQty: z.number().nonnegative().default(0),
  shade: z.string().max(60).optional(),
  reworkCount: z.number().int().nonnegative().default(0),
});

const finishSchema = z.object({
  factoryId: z.string().min(1),
  dyeBatchId: z.string().min(1),
  process: z.string().min(1).max(60),
  inputQty: z.number().positive(),
  remarks: z.string().max(500).optional(),
});

const finishCompleteSchema = z.object({
  id: z.string().min(1),
  outputQty: z.number().positive(),
  shrinkagePct: z.number().min(0).max(100).optional(),
  gsmAfter: z.number().positive().optional(),
});

class TextileService extends BaseService {
  private async textileOn(user: SessionUser) {
    if (!(await isTextileEnabled(user.id))) {
      throw new BusinessRuleError("Textile processing is not enabled for your factories");
    }
  }

  // Record with factoryId: company scope + factory scope + textile factory check
  private async loadScoped<T extends { companyId: string; factoryId: string }>(
    user: SessionUser,
    row: T | null,
    name: string
  ): Promise<T> {
    const r = found(row, name) as T;
    await assertRecordInScope(user, r.companyId);
    assertFactoryInScope(await this.scopeOf(user), r.factoryId);
    await assertTextileFactory(r.factoryId);
    return r;
  }

  private async checkFactory(user: SessionUser, factoryId: string) {
    assertFactoryInScope(await this.scopeOf(user), factoryId);
    await assertTextileFactory(factoryId);
  }

  // ---------- dropdown data for forms ----------
  async options() {
    const user = await this.guard("textile.view");
    const scope = await this.scopeOf(user);
    const allFactories = await prisma.factory.findMany({
      where: { id: { in: scope.factoryIds }, status: "ACTIVE" },
      select: { id: true, code: true, name: true, factoryType: true },
    });
    const factories = allFactories.filter((f) => isTextileType(f.factoryType));
    const [warehouses, materials, lots, buyers, labDips, rolls] = await Promise.all([
      prisma.warehouse.findMany({
        where: { factoryId: { in: factories.map((f) => f.id) }, isActive: true },
        select: { id: true, code: true, name: true, factoryId: true },
      }),
      prisma.material.findMany({
        where: { companyId: user.companyId, status: "ACTIVE" },
        select: { id: true, code: true, name: true, unit: true },
        orderBy: { code: "asc" },
      }),
      prisma.inventoryLot.findMany({
        where: { companyId: user.companyId, material: { category: { code: "YARN" } } },
        select: { id: true, lotNo: true, material: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.buyer.findMany({
        where: { companyId: user.companyId },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.labDip.findMany({
        where: { companyId: user.companyId, status: { in: ["APPROVED", "BULK_DYEING"] } },
        select: { id: true, labDipNo: true, color: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fabricRoll.findMany({
        where: { companyId: user.companyId, inspectionStatus: { not: "REJECTED" } },
        select: { id: true, rollNo: true, quantity: true, material: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);
    return { factories, warehouses, materials, lots, buyers, labDips, rolls };
  }

  // ---------- Yarn ----------
  async listYarn() {
    const user = await this.guard("textile.view");
    await this.textileOn(user);
    const rows = await prisma.yarn.findMany({ where: await listFilter(user), orderBy: { createdAt: "desc" } });
    const lots = await prisma.inventoryLot.findMany({
      where: { id: { in: rows.map((r) => r.lotId) } },
      select: { id: true, lotNo: true, material: { select: { code: true } } },
    });
    const byId = new Map(lots.map((l) => [l.id, l]));
    return rows.map((r) => ({
      ...r,
      lotNo: byId.get(r.lotId)?.lotNo ?? "-",
      materialCode: byId.get(r.lotId)?.material.code ?? "-",
    }));
  }

  // Yarn comes in through the normal GRN (lot number is required). Here we add the yarn details to that lot.
  async registerYarn(input: unknown) {
    const user = await this.guard("textile.create");
    await this.textileOn(user);
    const d = yarnSchema.parse(input);
    const lot = found(
      await prisma.inventoryLot.findUnique({
        where: { id: d.lotId },
        include: { material: { include: { category: true } } },
      }),
      "Lot"
    );
    if (lot.companyId !== user.companyId) throw new BusinessRuleError("Lot not found");
    if (lot.material.category.code.toUpperCase() !== "YARN") {
      throw new BusinessRuleError("This is not a yarn lot (the material category must be YARN)");
    }
    if (await prisma.yarn.findUnique({ where: { lotId: d.lotId } })) {
      throw new BusinessRuleError("Yarn details are already registered for this lot");
    }
    const grn = await prisma.stockTransaction.aggregate({
      _sum: { quantity: true },
      where: { companyId: user.companyId, lotId: d.lotId, type: "GRN" },
    });
    const row = await prisma.yarn.create({
      data: {
        companyId: user.companyId,
        materialId: lot.materialId,
        lotId: d.lotId,
        yarnType: d.yarnType,
        yarnCount: d.yarnCount,
        composition: d.composition,
        color: d.color ?? lot.color ?? undefined,
        supplierId: lot.supplierId ?? undefined,
        qty: grn._sum.quantity ?? 0,
        rate: d.rate,
        currency: (d.currency ?? "BDT").toUpperCase(),
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "Yarn", entityId: row.id, after: row });
    return row;
  }

  // ---------- Lab dip ----------
  async listLabDips() {
    const user = await this.guard("textile.view");
    await this.textileOn(user);
    const scope = await this.scopeOf(user);
    return prisma.labDip.findMany({
      where: { ...(await listFilter(user)), ...factoryWhere(scope) },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLabDip(id: string) {
    const user = await this.guard("textile.view");
    await this.loadScoped(user, await prisma.labDip.findUnique({ where: { id } }), "Lab dip");
    return prisma.labDip.findUnique({
      where: { id },
      include: { submissions: { orderBy: { round: "asc" } }, dyeBatches: { orderBy: { createdAt: "desc" } } },
    });
  }

  async createLabDip(input: unknown) {
    const user = await this.guard("textile.create");
    const d = labDipSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const buyer = found(await prisma.buyer.findUnique({ where: { id: d.buyerId } }), "Buyer");
    if (buyer.companyId !== user.companyId) throw new BusinessRuleError("Buyer not found");
    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:labdip:${user.companyId}`);
      return tx.labDip.create({
        data: {
          companyId: user.companyId,
          factoryId: d.factoryId,
          labDipNo: await nextLabDipNo(user.companyId),
          buyerId: d.buyerId,
          styleId: d.styleId,
          orderId: d.orderId,
          color: d.color,
          standardRef: d.standardRef,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "LabDip", entityId: row.id, after: row });
    return row;
  }

  private async labStep(
    id: string,
    to: "DYEING" | "LAB_DIP" | "BUYER_REVIEW" | "APPROVED" | "REJECTED",
    permission: string,
    build: (cur: { resubmissionCount: number }, submissionCount: number) => {
      data: Record<string, unknown>;
      submission?: { create?: Record<string, unknown>; update?: Record<string, unknown> };
    },
    reason?: string
  ) {
    const user = await this.guard(permission);
    const row = await this.loadScoped(user, await prisma.labDip.findUnique({ where: { id } }), "Lab dip");
    assertTransition(labDipTransitions, row.status, to);
    const saved = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `labdip:${id}`);
      const cur = found(await tx.labDip.findUnique({ where: { id } }), "Lab dip");
      if (cur.status !== row.status) throw new BusinessRuleError("Lab dip status changed. Reload and try again");
      const count = await tx.labDipSubmission.count({ where: { labDipId: id } });
      const plan = build(cur, count);
      if (plan.submission?.create) {
        await tx.labDipSubmission.create({
          data: { labDipId: id, round: nextSubmissionRound(count), submittedAt: today(), ...plan.submission.create },
        });
      }
      if (plan.submission?.update) {
        await tx.labDipSubmission.updateMany({ where: { labDipId: id, round: count }, data: plan.submission.update });
      }
      return tx.labDip.update({ where: { id }, data: { status: to, ...plan.data } });
    }, TX_OPTIONS);
    await this.audit({
      user, action: "UPDATE", entity: "LabDip", entityId: id,
      before: { status: row.status, resubmissionCount: row.resubmissionCount },
      after: { status: saved.status, resubmissionCount: saved.resubmissionCount },
      reason,
    });
    return saved;
  }

  startLabDipDyeing(id: string) {
    return this.labStep(id, "DYEING", "textile.edit", () => ({ data: {} }));
  }
  markLabDipReady(id: string) {
    return this.labStep(id, "LAB_DIP", "textile.edit", () => ({ data: {} }));
  }
  submitLabDip(id: string) {
    return this.labStep(id, "BUYER_REVIEW", "textile.edit", () => ({
      data: { submissionDate: today() },
      submission: { create: {} },
    }));
  }
  approveLabDip(id: string, comments?: string) {
    return this.labStep(id, "APPROVED", "textile.approve", () => ({
      data: { approvalDate: today(), buyerComments: comments ?? null, rejectionReason: null },
      submission: { update: { decision: "APPROVED", comments: comments ?? null, decidedAt: today() } },
    }));
  }
  rejectLabDip(id: string, reason: string, comments?: string) {
    assertRejectionReason(reason);
    return this.labStep(
      id, "REJECTED", "textile.approve",
      () => ({
        data: { rejectionReason: reason, buyerComments: comments ?? null },
        submission: { update: { decision: "REJECTED", reason, comments: comments ?? null, decidedAt: today() } },
      }),
      reason
    );
  }
  // Rejected -> dyeing again: this is a resubmission, so the count goes up
  resubmitLabDip(id: string) {
    return this.labStep(id, "DYEING", "textile.edit", (cur) => ({
      data: { resubmissionCount: nextResubmissionCount(cur.resubmissionCount) },
    }));
  }

  // ---------- Knitting ----------
  async listKnitting() {
    const user = await this.guard("textile.view");
    await this.textileOn(user);
    const scope = await this.scopeOf(user);
    return prisma.knittingOrder.findMany({
      where: { ...(await listFilter(user)), ...factoryWhere(scope) },
      orderBy: { createdAt: "desc" },
    });
  }

  async getKnitting(id: string) {
    const user = await this.guard("textile.view");
    await this.loadScoped(user, await prisma.knittingOrder.findUnique({ where: { id } }), "Knitting order");
    const row = await prisma.knittingOrder.findUnique({ where: { id }, include: { outputs: true } });
    const rolls = await prisma.fabricRoll.findMany({
      where: { id: { in: row!.outputs.map((o) => o.rollId) } },
      select: { id: true, rollNo: true },
    });
    return { ...row!, rollNos: Object.fromEntries(rolls.map((r) => [r.id, r.rollNo])) };
  }

  async createKnitting(input: unknown) {
    const user = await this.guard("textile.create");
    const d = knitSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const wh = await loadWarehouse(user, d.warehouseId);
    if (wh.factoryId !== d.factoryId) throw new BusinessRuleError("Warehouse does not belong to this factory");
    const lot = found(await prisma.inventoryLot.findUnique({ where: { id: d.yarnLotId } }), "Yarn lot");
    if (lot.companyId !== user.companyId) throw new BusinessRuleError("Yarn lot not found");
    const greige = found(await prisma.material.findUnique({ where: { id: d.greigeMaterialId } }), "Greige material");
    if (greige.companyId !== user.companyId) throw new BusinessRuleError("Greige material not found");
    if (d.orderId) {
      const o = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
      if (o.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    }
    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:knit:${user.companyId}`);
      return tx.knittingOrder.create({
        data: {
          companyId: user.companyId,
          factoryId: d.factoryId,
          knitNo: await nextKnittingNo(user.companyId),
          machineNo: d.machineNo,
          program: d.program,
          orderId: d.orderId,
          yarnMaterialId: lot.materialId,
          yarnLotId: lot.id,
          greigeMaterialId: d.greigeMaterialId,
          warehouseId: d.warehouseId,
          plannedQty: d.plannedQty,
          yarnRequiredQty: yarnRequired(d.plannedQty, d.wastagePct),
          productionDate: d.productionDate ? toDateOnly(d.productionDate) : undefined,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "KnittingOrder", entityId: row.id, after: row });
    return row;
  }

  // Yarn goes out of stock (ISSUE) through stock.ts
  async issueYarn(id: string) {
    const user = await this.guard("textile.edit");
    const row = await this.loadScoped(user, await prisma.knittingOrder.findUnique({ where: { id } }), "Knitting order");
    assertTransition(knittingTransitions, row.status, "YARN_ISSUED");
    const mat = found(await prisma.material.findUnique({ where: { id: row.yarnMaterialId } }), "Yarn material");
    const saved = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `knit:${id}`);
      const cur = found(await tx.knittingOrder.findUnique({ where: { id } }), "Knitting order");
      if (cur.status !== "PLANNED") throw new BusinessRuleError("Yarn is already issued for this order");
      await postStockTx(tx, {
        companyId: row.companyId,
        materialId: row.yarnMaterialId,
        warehouseId: row.warehouseId,
        type: "ISSUE",
        quantity: Number(row.yarnRequiredQty),
        unit: mat.unit,
        lotId: row.yarnLotId,
        orderId: row.orderId ?? undefined,
        refType: "KnittingOrder",
        refId: id,
        userId: user.id,
      });
      return tx.knittingOrder.update({
        where: { id },
        data: { status: "YARN_ISSUED", yarnIssuedQty: row.yarnRequiredQty },
      });
    }, TX_OPTIONS);
    await this.audit({
      user, action: "UPDATE", entity: "KnittingOrder", entityId: id,
      before: { status: row.status }, after: { status: saved.status, yarnIssuedQty: Number(saved.yarnIssuedQty) },
    });
    return saved;
  }

  // Greige rolls come into stock (PRODUCTION_IN) as fabric rolls + lot
  async completeKnitting(input: unknown) {
    const user = await this.guard("textile.edit");
    const d = knitCompleteSchema.parse(input);
    const row = await this.loadScoped(user, await prisma.knittingOrder.findUnique({ where: { id: d.id } }), "Knitting order");
    assertTransition(knittingTransitions, row.status, "COMPLETED");
    const good = d.rolls.reduce((s, r) => s + r.quantity, 0);
    if (!knittingOutputOk(Number(row.yarnIssuedQty), good, d.rejectQty)) {
      throw new BusinessRuleError(
        `Output ${good} + reject ${d.rejectQty} is more than the yarn issued ${Number(row.yarnIssuedQty)}`
      );
    }
    const greige = found(await prisma.material.findUnique({ where: { id: row.greigeMaterialId } }), "Greige material");
    const yarnLot = await prisma.inventoryLot.findUnique({ where: { id: row.yarnLotId } });
    const saved = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `knit:${row.id}`);
      const cur = found(await tx.knittingOrder.findUnique({ where: { id: row.id } }), "Knitting order");
      if (cur.status !== "YARN_ISSUED") throw new BusinessRuleError("This order is not waiting for output");
      let n = 0;
      for (const r of d.rolls) {
        n += 1;
        const made = await postProducedRoll(tx, {
          companyId: row.companyId,
          materialId: row.greigeMaterialId,
          warehouseId: row.warehouseId,
          lotNo: row.knitNo,
          rollNo: `${row.knitNo}-R${String(n).padStart(3, "0")}`,
          color: yarnLot?.color ?? undefined,
          gsm: r.gsm,
          widthCm: r.widthCm,
          weightKg: r.weightKg,
          quantity: r.quantity,
          unit: greige.unit,
          orderId: row.orderId ?? undefined,
          refType: "KnittingOrder",
          refId: row.id,
          userId: user.id,
        });
        await tx.knittingOutput.create({ data: { knittingId: row.id, rollId: made.roll.id, quantity: r.quantity } });
      }
      return tx.knittingOrder.update({
        where: { id: row.id },
        data: {
          status: "COMPLETED",
          actualQty: good,
          rejectQty: d.rejectQty,
          productionDate: row.productionDate ?? today(),
          completedAt: new Date(),
        },
      });
    }, TX_OPTIONS);
    await this.audit({
      user, action: "UPDATE", entity: "KnittingOrder", entityId: row.id,
      before: { status: row.status }, after: { status: saved.status, actualQty: good, rejectQty: d.rejectQty },
    });
    return saved;
  }

  async closeKnitting(id: string) {
    const user = await this.guard("textile.close");
    const row = await this.loadScoped(user, await prisma.knittingOrder.findUnique({ where: { id } }), "Knitting order");
    assertTransition(knittingTransitions, row.status, "CLOSED");
    const saved = await prisma.knittingOrder.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
    await this.audit({
      user, action: "UPDATE", entity: "KnittingOrder", entityId: id,
      before: { status: row.status }, after: { status: saved.status },
    });
    return saved;
  }

  async cancelKnitting(id: string, reason: string) {
    const user = await this.guard("textile.edit");
    assertRejectionReason(reason);
    const row = await this.loadScoped(user, await prisma.knittingOrder.findUnique({ where: { id } }), "Knitting order");
    assertTransition(knittingTransitions, row.status, "CANCELLED");
    const saved = await prisma.knittingOrder.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
    await this.audit({
      user, action: "UPDATE", entity: "KnittingOrder", entityId: id,
      before: { status: row.status }, after: { status: saved.status }, reason,
    });
    return saved;
  }

  // ---------- Dye batch ----------
  async listDyeBatches() {
    const user = await this.guard("textile.view");
    await this.textileOn(user);
    const scope = await this.scopeOf(user);
    return prisma.dyeBatch.findMany({
      where: { ...(await listFilter(user)), ...factoryWhere(scope) },
      include: { labDip: { select: { labDipNo: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDyeBatch(id: string) {
    const user = await this.guard("textile.view");
    await this.loadScoped(user, await prisma.dyeBatch.findUnique({ where: { id } }), "Dye batch");
    return prisma.dyeBatch.findUnique({
      where: { id },
      include: { labDip: true, finishings: { orderBy: { createdAt: "desc" } } },
    });
  }

  // Bulk dyeing is blocked unless the lab dip is approved
  async createDyeBatch(input: unknown) {
    const user = await this.guard("textile.create");
    const d = dyeSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const labDip = found(await prisma.labDip.findUnique({ where: { id: d.labDipId } }), "Lab dip");
    if (labDip.companyId !== user.companyId) throw new BusinessRuleError("Lab dip not found");
    if (!canStartBulkDyeing(labDip.status)) {
      throw new BusinessRuleError("Bulk dyeing is blocked: the lab dip is not approved yet");
    }
    const roll = found(await prisma.fabricRoll.findUnique({ where: { id: d.greigeRollId } }), "Greige roll");
    if (roll.companyId !== user.companyId) throw new BusinessRuleError("Roll not found");
    if (roll.inspectionStatus === "REJECTED") throw new BusinessRuleError(`Roll ${roll.rollNo} is rejected`);
    const wh = await loadWarehouse(user, roll.warehouseId);
    if (wh.factoryId !== d.factoryId) throw new BusinessRuleError("The roll is in another factory");
    const dyed = found(await prisma.material.findUnique({ where: { id: d.dyedMaterialId } }), "Dyed fabric material");
    if (dyed.companyId !== user.companyId) throw new BusinessRuleError("Dyed fabric material not found");
    const have = await onHand(prisma, {
      companyId: user.companyId, materialId: roll.materialId, warehouseId: roll.warehouseId, rollId: roll.id,
    });
    if (d.inputQty > have + EPS) throw new BusinessRuleError(`Roll ${roll.rollNo} has only ${have} in stock`);

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:dye:${user.companyId}`);
      if (labDip.status === "APPROVED") {
        assertTransition(labDipTransitions, "APPROVED", "BULK_DYEING");
        await tx.labDip.update({ where: { id: labDip.id }, data: { status: "BULK_DYEING" } });
      }
      return tx.dyeBatch.create({
        data: {
          companyId: user.companyId,
          factoryId: d.factoryId,
          dyeNo: await nextDyeNo(user.companyId),
          dyeLot: d.dyeLot,
          batchNo: d.batchNo,
          labDipId: labDip.id,
          color: d.color ?? labDip.color,
          recipe: d.recipe,
          greigeRollId: roll.id,
          greigeMaterialId: roll.materialId,
          dyedMaterialId: d.dyedMaterialId,
          warehouseId: roll.warehouseId,
          orderId: labDip.orderId ?? undefined,
          inputQty: d.inputQty,
          chemicals: d.chemicals ?? undefined,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "DyeBatch", entityId: row.id, after: row });
    return row;
  }

  // Greige roll goes out of stock (ISSUE)
  async startDyeBatch(id: string) {
    const user = await this.guard("textile.edit");
    const row = await this.loadScoped(user, await prisma.dyeBatch.findUnique({ where: { id } }), "Dye batch");
    assertTransition(dyeBatchTransitions, row.status, "IN_PROCESS");
    const mat = found(await prisma.material.findUnique({ where: { id: row.greigeMaterialId } }), "Greige material");
    const roll = found(await prisma.fabricRoll.findUnique({ where: { id: row.greigeRollId } }), "Greige roll");
    const saved = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `dye:${id}`);
      const cur = found(await tx.dyeBatch.findUnique({ where: { id } }), "Dye batch");
      if (cur.status !== "PLANNED") throw new BusinessRuleError("This batch has already started");
      await postStockTx(tx, {
        companyId: row.companyId,
        materialId: row.greigeMaterialId,
        warehouseId: row.warehouseId,
        type: "ISSUE",
        quantity: Number(row.inputQty),
        unit: mat.unit,
        lotId: roll.lotId,
        rollId: roll.id,
        orderId: row.orderId ?? undefined,
        refType: "DyeBatch",
        refId: id,
        userId: user.id,
      });
      return tx.dyeBatch.update({ where: { id }, data: { status: "IN_PROCESS", startedAt: new Date() } });
    }, TX_OPTIONS);
    await this.audit({
      user, action: "UPDATE", entity: "DyeBatch", entityId: id,
      before: { status: row.status }, after: { status: saved.status },
    });
    return saved;
  }

  // Dyed fabric comes into stock as a new roll + lot (PRODUCTION_IN)
  async completeDyeBatch(input: unknown) {
    const user = await this.guard("textile.edit");
    const d = dyeCompleteSchema.parse(input);
    const row = await this.loadScoped(user, await prisma.dyeBatch.findUnique({ where: { id: d.id } }), "Dye batch");
    assertTransition(dyeBatchTransitions, row.status, "COMPLETED");
    if (!outputWithinInput(Number(row.inputQty), d.outputQty, d.rejectQty)) {
      throw new BusinessRuleError(`Output ${d.outputQty} + reject ${d.rejectQty} is more than the input ${Number(row.inputQty)}`);
    }
    const dyed = found(await prisma.material.findUnique({ where: { id: row.dyedMaterialId } }), "Dyed fabric material");
    const saved = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `dye:${row.id}`);
      const cur = found(await tx.dyeBatch.findUnique({ where: { id: row.id } }), "Dye batch");
      if (cur.status !== "IN_PROCESS") throw new BusinessRuleError("This batch is not in process");
      const made = await postProducedRoll(tx, {
        companyId: row.companyId,
        materialId: row.dyedMaterialId,
        warehouseId: row.warehouseId,
        lotNo: row.dyeLot,
        rollNo: `${row.dyeNo}-R001`,
        color: row.color,
        shade: d.shade,
        quantity: d.outputQty,
        unit: dyed.unit,
        orderId: row.orderId ?? undefined,
        refType: "DyeBatch",
        refId: row.id,
        userId: user.id,
      });
      return tx.dyeBatch.update({
        where: { id: row.id },
        data: {
          status: "COMPLETED",
          outputQty: d.outputQty,
          rejectQty: d.rejectQty,
          shade: d.shade,
          reworkCount: d.reworkCount,
          outputRollId: made.roll.id,
          completedAt: new Date(),
        },
      });
    }, TX_OPTIONS);
    await this.audit({
      user, action: "UPDATE", entity: "DyeBatch", entityId: row.id,
      before: { status: row.status }, after: { status: saved.status, outputQty: d.outputQty, rejectQty: d.rejectQty },
    });
    return saved;
  }

  async closeDyeBatch(id: string) {
    const user = await this.guard("textile.close");
    const row = await this.loadScoped(user, await prisma.dyeBatch.findUnique({ where: { id } }), "Dye batch");
    assertTransition(dyeBatchTransitions, row.status, "CLOSED");
    const saved = await prisma.dyeBatch.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
    await this.audit({
      user, action: "UPDATE", entity: "DyeBatch", entityId: id,
      before: { status: row.status }, after: { status: saved.status },
    });
    return saved;
  }

  async cancelDyeBatch(id: string, reason: string) {
    const user = await this.guard("textile.edit");
    assertRejectionReason(reason);
    const row = await this.loadScoped(user, await prisma.dyeBatch.findUnique({ where: { id } }), "Dye batch");
    assertTransition(dyeBatchTransitions, row.status, "CANCELLED");
    const saved = await prisma.dyeBatch.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
    await this.audit({
      user, action: "UPDATE", entity: "DyeBatch", entityId: id,
      before: { status: row.status }, after: { status: saved.status }, reason,
    });
    return saved;
  }

  // ---------- Finishing (log only, no stock effect) ----------
  async listFinishing() {
    const user = await this.guard("textile.view");
    await this.textileOn(user);
    const scope = await this.scopeOf(user);
    return prisma.fabricFinishing.findMany({
      where: { ...(await listFilter(user)), ...factoryWhere(scope) },
      include: { dyeBatch: { select: { dyeNo: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getFinishing(id: string) {
    const user = await this.guard("textile.view");
    await this.loadScoped(user, await prisma.fabricFinishing.findUnique({ where: { id } }), "Finishing");
    return prisma.fabricFinishing.findUnique({ where: { id }, include: { dyeBatch: true } });
  }

  async createFinishing(input: unknown) {
    const user = await this.guard("textile.create");
    const d = finishSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const batch = found(await prisma.dyeBatch.findUnique({ where: { id: d.dyeBatchId } }), "Dye batch");
    if (batch.companyId !== user.companyId || batch.factoryId !== d.factoryId) {
      throw new BusinessRuleError("Dye batch not found in this factory");
    }
    if (batch.status !== "COMPLETED" && batch.status !== "CLOSED") {
      throw new BusinessRuleError("Finishing can start only after the dye batch is completed");
    }
    if (d.inputQty > Number(batch.outputQty) + EPS) {
      throw new BusinessRuleError(`Input is more than the dyed output ${Number(batch.outputQty)}`);
    }
    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:finish:${user.companyId}`);
      return tx.fabricFinishing.create({
        data: {
          companyId: user.companyId,
          factoryId: d.factoryId,
          finishNo: await nextFinishingNo(user.companyId),
          dyeBatchId: batch.id,
          rollId: batch.outputRollId ?? undefined,
          process: d.process,
          inputQty: d.inputQty,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "FabricFinishing", entityId: row.id, after: row });
    return row;
  }

  private async finStep(id: string, to: "IN_PROCESS" | "COMPLETED" | "CANCELLED", data: Record<string, unknown>, reason?: string) {
    const user = await this.guard("textile.edit");
    const row = await this.loadScoped(user, await prisma.fabricFinishing.findUnique({ where: { id } }), "Finishing");
    assertTransition(fabricFinishingTransitions, row.status, to);
    if (to === "COMPLETED" && typeof data.outputQty === "number" && data.outputQty > Number(row.inputQty) + EPS) {
      throw new BusinessRuleError("Output cannot be more than the input");
    }
    const saved = await prisma.fabricFinishing.update({ where: { id }, data: { status: to, ...data } });
    await this.audit({
      user, action: "UPDATE", entity: "FabricFinishing", entityId: id,
      before: { status: row.status }, after: { status: saved.status }, reason,
    });
    return saved;
  }

  startFinishing(id: string) {
    return this.finStep(id, "IN_PROCESS", {});
  }
  completeFinishing(input: unknown) {
    const d = finishCompleteSchema.parse(input);
    return this.finStep(d.id, "COMPLETED", {
      outputQty: d.outputQty,
      shrinkagePct: d.shrinkagePct,
      gsmAfter: d.gsmAfter,
      completedAt: new Date(),
    });
  }
  cancelFinishing(id: string) {
    return this.finStep(id, "CANCELLED", {});
  }
}

export const textileService = new TextileService();