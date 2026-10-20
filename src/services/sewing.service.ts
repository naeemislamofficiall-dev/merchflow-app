import { z } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";
import { hourEfficiency, summarizeHours } from "@/lib/production-calc";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/permissions";
import { assertFactoryInScope } from "@/lib/scope";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";
import { toDateOnly } from "./currency.service";

const nn = z.number().int().nonnegative();

const logSchema = z.object({
  productionOrderId: z.string().min(1),
  lineId: z.string().min(1),
  logDate: z.coerce.date(),
  hour: z.number().int().min(0).max(23), // 9 মানে 9-10
  target: nn,
  output: nn, // ভালো পিস
  reject: nn.optional(),
  rework: nn.optional(),
  downtimeMinutes: z.number().int().min(0).max(60).optional(),
  downtimeReason: z.string().max(200).optional(),
  operators: z.number().int().positive().optional(),
  remarks: z.string().max(500).optional(),
});

class SewingService extends BaseService {
  private async loadPo(user: SessionUser, id: string) {
    const po = found(await prisma.productionOrder.findUnique({ where: { id } }), "Production order");
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    return po;
  }

  private async loadLine(user: SessionUser, lineId: string) {
    const line = found(
      await prisma.line.findUnique({
        where: { id: lineId },
        include: { floor: { include: { building: true } } },
      }),
      "Line"
    );
    const factory = found(await prisma.factory.findUnique({ where: { id: line.floor.building.factoryId } }), "Factory");
    await assertRecordInScope(user, factory.companyId);
    assertFactoryInScope(await this.scopeOf(user), factory.id);
    return { line, factoryId: factory.id };
  }

  // ---------- জমা (একই লাইন-ঘণ্টায় আবার দিলে সংশোধন হয়) ----------

  async save(input: unknown) {
    const user = await this.guard("sewing.record");
    const d = logSchema.parse(input);
    const downtime = d.downtimeMinutes ?? 0;
    if (downtime > 0 && !d.downtimeReason?.trim()) {
      throw new BusinessRuleError("A reason is required when downtime is recorded");
    }

    const po = await this.loadPo(user, d.productionOrderId);
    if (po.status !== "IN_PROGRESS") {
      throw new BusinessRuleError("Start the production order before recording sewing output");
    }
    const { line, factoryId } = await this.loadLine(user, d.lineId);
    if (!line.isActive || factoryId !== po.factoryId) {
      throw new BusinessRuleError("This line does not belong to the factory of the production order");
    }

    const logDate = toDateOnly(d.logDate);
    const key = { lineId: d.lineId, logDate, hour: d.hour };

    const { row, before } = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `sewing:${po.id}`);
      const existing = await tx.sewingLog.findUnique({ where: { lineId_logDate_hour: key } });
      if (existing && existing.productionOrderId !== po.id) {
        throw new BusinessRuleError("This line and hour already has a log for another production order");
      }

      // সেলাই কাটা পিসের বেশি হতে পারে না
      const cut = await tx.bundle.aggregate({ _sum: { quantity: true }, where: { productionOrderId: po.id } });
      const others = await tx.sewingLog.aggregate({
        _sum: { output: true },
        where: { productionOrderId: po.id, ...(existing ? { id: { not: existing.id } } : {}) },
      });
      const cutQty = cut._sum.quantity ?? 0;
      const total = (others._sum.output ?? 0) + d.output;
      if (total > cutQty) {
        throw new BusinessRuleError(
          `Total sewing output would be ${total}, but only ${cutQty} pieces are cut (bundled) for this production order`
        );
      }

      const data = {
        target: d.target,
        output: d.output,
        reject: d.reject ?? 0,
        rework: d.rework ?? 0,
        downtimeMinutes: downtime,
        downtimeReason: downtime > 0 ? d.downtimeReason : null,
        operators: d.operators,
        remarks: d.remarks,
      };
      const saved = existing
        ? await tx.sewingLog.update({ where: { id: existing.id }, data })
        : await tx.sewingLog.create({
            data: {
              ...data,
              ...key,
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
      entity: "SewingLog",
      entityId: row.id,
      before,
      after: row,
    });
    return { ...row, efficiencyPct: hourEfficiency(row.target, row.output) };
  }
  // ফর্মের ড্রপডাউনের জন্য: সক্রিয় লাইন আর চলমান production order
  async formOptions() {
    const user = await this.guard("sewing.view");
    const scope = await this.scopeOf(user);
    const [lines, orders] = await Promise.all([
      prisma.line.findMany({
        where: { isActive: true, floor: { building: { factoryId: { in: scope.factoryIds } } } },
        select: {
          id: true,
          code: true,
          name: true,
          floor: { select: { building: { select: { factoryId: true } } } },
        },
        orderBy: { code: "asc" },
      }),
      prisma.productionOrder.findMany({
        where: { companyId: user.companyId, status: "IN_PROGRESS", factoryId: { in: scope.factoryIds } },
        select: { id: true, productionNo: true, factoryId: true, style: { select: { styleNo: true } } },
        orderBy: { productionNo: "asc" },
      }),
    ]);
    return {
      lines: lines.map((l) => ({
        id: l.id,
        label: `${l.code} - ${l.name}`,
        factoryId: l.floor.building.factoryId,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        label: `${o.productionNo} (${o.style.styleNo})`,
        factoryId: o.factoryId,
      })),
    };
  }
  // ---------- দেখা ----------

  // একটা লাইনের একদিনের ঘণ্টাওয়ারি তালিকা (স্পেকের Hour / Target / Actual / Efficiency টেবিল)
  async lineDay(lineId: string, date: Date | string) {
    const user = await this.guard("sewing.view");
    await this.loadLine(user, lineId);
    const rows = await prisma.sewingLog.findMany({
      where: { lineId, logDate: toDateOnly(new Date(date)) },
      include: { productionOrder: { select: { productionNo: true } } },
      orderBy: { hour: "asc" },
    });
    return {
      hours: rows.map((r) => ({ ...r, efficiencyPct: hourEfficiency(r.target, r.output) })),
      total: summarizeHours(rows),
    };
  }

  // একটা production order-এর দিনওয়ারি যোগফল
  async byProductionOrder(productionOrderId: string) {
    const user = await this.guard("sewing.view");
    await this.loadPo(user, productionOrderId);
    const rows = await prisma.sewingLog.findMany({
      where: { productionOrderId },
      orderBy: [{ logDate: "asc" }, { hour: "asc" }],
    });
    const byDay = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.logDate.toISOString().slice(0, 10);
      byDay.set(k, [...(byDay.get(k) ?? []), r]);
    }
    return {
      days: [...byDay.entries()].map(([date, list]) => ({ date, ...summarizeHours(list) })),
      total: summarizeHours(rows),
    };
  }
}

export const sewingService = new SewingService();