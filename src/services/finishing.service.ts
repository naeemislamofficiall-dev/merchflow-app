import { z } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";
import { type FunnelTotals, funnelErrors, sumFunnel } from "@/lib/production-calc";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { assertFactoryInScope } from "@/lib/scope";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";
import { toDateOnly } from "./currency.service";

const nn = z.number().int().nonnegative();

// ফাঁকা ঘর = ০। একই দিনে আবার দিলে ওই দিনের সব সংখ্যা বদলে যায় (সংশোধন)।
const saveSchema = z.object({
  productionOrderId: z.string().min(1),
  logDate: z.coerce.date(),
  inputQty: nn.optional(),
  threadCutQty: nn.optional(),
  ironedQty: nn.optional(),
  foldedQty: nn.optional(),
  metalCheckedQty: nn.optional(),
  qcPassedQty: nn.optional(),
  reworkQty: nn.optional(),
  outputQty: nn.optional(),
  remarks: z.string().max(500).optional(),
});

type Row = {
  inputQty: number;
  threadCutQty: number;
  ironedQty: number;
  foldedQty: number;
  metalCheckedQty: number;
  qcPassedQty: number;
  reworkQty: number;
  outputQty: number;
};

function toFunnel(r: Row): FunnelTotals {
  return {
    input: r.inputQty,
    threadCut: r.threadCutQty,
    ironed: r.ironedQty,
    folded: r.foldedQty,
    metalChecked: r.metalCheckedQty,
    qcPassed: r.qcPassedQty,
    rework: r.reworkQty,
    output: r.outputQty,
  };
}

class FinishingService extends BaseService {
  private async loadPo(user: SessionUser, id: string) {
    const po = found(await prisma.productionOrder.findUnique({ where: { id } }), "Production order");
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    return po;
  }

  async save(input: unknown) {
    const user = await this.guard("finishing.record");
    const d = saveSchema.parse(input);
    const po = await this.loadPo(user, d.productionOrderId);
    if (po.status !== "IN_PROGRESS") {
      throw new BusinessRuleError("Start the production order before recording finishing");
    }
    const onRoute = await prisma.productionRouteStep.count({
      where: { routeId: po.routeId, process: "FINISHING" },
    });
    if (onRoute === 0) throw new BusinessRuleError("FINISHING is not a step in the route of this production order");

    const logDate = toDateOnly(d.logDate);
    const today: Row = {
      inputQty: d.inputQty ?? 0,
      threadCutQty: d.threadCutQty ?? 0,
      ironedQty: d.ironedQty ?? 0,
      foldedQty: d.foldedQty ?? 0,
      metalCheckedQty: d.metalCheckedQty ?? 0,
      qcPassedQty: d.qcPassedQty ?? 0,
      reworkQty: d.reworkQty ?? 0,
      outputQty: d.outputQty ?? 0,
    };

    const { row, before } = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `finishing:${po.id}`);
      const existing = await tx.finishingLog.findUnique({
        where: { productionOrderId_logDate: { productionOrderId: po.id, logDate } },
      });
      const others = await tx.finishingLog.findMany({
        where: { productionOrderId: po.id, ...(existing ? { id: { not: existing.id } } : {}) },
      });
      const sewing = await tx.sewingLog.aggregate({ _sum: { output: true }, where: { productionOrderId: po.id } });

      const totals = sumFunnel([...others.map(toFunnel), toFunnel(today)]);
      const errors = funnelErrors(totals, sewing._sum.output ?? 0);
      if (errors.length > 0) throw new BusinessRuleError(errors[0]);

      const saved = existing
        ? await tx.finishingLog.update({ where: { id: existing.id }, data: { ...today, remarks: d.remarks } })
        : await tx.finishingLog.create({
            data: {
              ...today,
              remarks: d.remarks,
              logDate,
              companyId: po.companyId,
              factoryId: po.factoryId,
              productionOrderId: po.id,
              styleId: po.styleId,
              createdById: user.id,
            },
          });
      return { row: saved, before: existing };
    }, TX_OPTIONS);

    await this.audit({
      user,
      action: before ? "UPDATE" : "CREATE",
      entity: "FinishingLog",
      entityId: row.id,
      before,
      after: row,
    });
    return row;
  }

  // দিনওয়ারি তালিকা + মোট + Sewing থেকে কত আসতে বাকি
  async forProductionOrder(productionOrderId: string) {
    const user = await this.guard("finishing.view");
    await this.loadPo(user, productionOrderId);
    const logs = await prisma.finishingLog.findMany({
      where: { productionOrderId },
      orderBy: { logDate: "asc" },
    });
    const sewing = await prisma.sewingLog.aggregate({ _sum: { output: true }, where: { productionOrderId } });
    const sewingOutput = sewing._sum.output ?? 0;
    const totals = sumFunnel(logs.map(toFunnel));
    return { logs, totals, sewingOutput, waitingForFinishing: sewingOutput - totals.input };
  }
}

export const finishingService = new FinishingService();