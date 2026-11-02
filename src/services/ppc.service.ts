import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import {
  DEFAULT_WEEKEND_DAYS,
  bucketKey,
  capacityGap,
  dateKey,
  exceedsOrderQty,
  isOverloaded,
  lineDayLoads,
  lineMinutesPerDay,
  loadPct,
  overloadedLineDays,
  plannedMinutes,
  remainingToPlan,
} from "@/lib/capacity-calc";
import { can, type SessionUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertTransition, ppcAllocationTransitions } from "@/lib/status-rules";
import { TX_OPTIONS, advisoryLock } from "@/lib/stock";
import { BaseService } from "./base.service";

const OPEN = ["PLANNED", "RELEASED", "IN_PROGRESS", "PAUSED"] as const;
const DAY_MS = 86_400_000;

// Shob date UTC midnight (Prisma @db.Date-er moto), jate timezone-e din na soro
const utcDay = (d: Date) => new Date(`${dateKey(d)}T00:00:00.000Z`);
const keyDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const spanDays = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;

function allKeys(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(dateKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

// Weekend (default Friday) ba holiday hole oi din-e capacity 0
function isOffDay(key: string, holidays: Set<string>) {
  return DEFAULT_WEEKEND_DAYS.includes(keyDate(key).getUTCDay()) || holidays.has(key);
}

const allocateSchema = z.object({
  productionOrderId: z.string().min(1),
  lineId: z.string().min(1),
  date: z.coerce.date(),
  plannedQty: z.number().int().positive(),
  remarks: z.string().max(300).optional(),
});

const updateSchema = z
  .object({
    lineId: z.string().min(1),
    date: z.coerce.date(),
    plannedQty: z.number().int().positive(),
    remarks: z.string().max(300),
  })
  .partial();

const rangeSchema = z.object({
  factoryId: z.string().min(1),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const tableSchema = rangeSchema.extend({
  mode: z.enum(["daily", "weekly"]).default("weekly"),
});

const holidaySchema = z.object({
  factoryId: z.string().min(1),
  date: z.coerce.date(),
  reason: z.string().min(2).max(100),
});

class PpcService extends BaseService {
  // ---------- helpers ----------

  private async factory(user: SessionUser, factoryId: string) {
    const f = found(await prisma.factory.findUnique({ where: { id: factoryId } }), "Factory");
    if (f.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
    assertFactoryInScope(await this.scopeOf(user), f.id);
    return f;
  }

  private async loadPo(user: SessionUser, id: string) {
    const po = found(
      await prisma.productionOrder.findUnique({
        where: { id },
        include: { style: { select: { styleNo: true } } },
      }),
      "Production order"
    );
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    return po;
  }

  private async loadAllocation(user: SessionUser, id: string) {
    const a = found(await prisma.ppcAllocation.findUnique({ where: { id } }), "Allocation");
    await assertRecordInScope(user, a.companyId);
    assertFactoryInScope(await this.scopeOf(user), a.factoryId);
    return a;
  }

  private assertPoOpen(status: string) {
    if (!(OPEN as readonly string[]).includes(status)) {
      throw new BusinessRuleError(
        "Allocations can change only for a Planned, Released, In Progress or Paused production order"
      );
    }
  }

  // Line -> Floor -> Building -> Factory
  private async assertLineInFactory(lineId: string, factoryId: string) {
    const line = found(
      await prisma.line.findUnique({
        where: { id: lineId },
        include: { floor: { include: { building: true } } },
      }),
      "Line"
    );
    if (!line.isActive || line.floor.building.factoryId !== factoryId) {
      throw new BusinessRuleError("This line does not belong to the factory of the production order");
    }
  }

  // Allocation-er jog production order qty-r beshi hobe na
  private async assertWithinQty(
    tx: Prisma.TransactionClient,
    poId: string,
    poQty: number,
    adding: number,
    excludeId?: string
  ) {
    const r = await tx.ppcAllocation.aggregate({
      _sum: { plannedQty: true },
      where: { productionOrderId: poId, status: { not: "CANCELLED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    const allocated = r._sum.plannedQty ?? 0;
    if (exceedsOrderQty(poQty, allocated, adding)) {
      throw new BusinessRuleError(
        `Production quantity is ${poQty}, already allocated ${allocated}, so at most ${remainingToPlan(poQty, allocated)} more can be allocated`
      );
    }
  }

  // Style -> total SMV (Operation Bulletin theke)
  private async smvMap(styleIds: string[]) {
    const ids = [...new Set(styleIds)];
    if (ids.length === 0) return new Map<string, number>();
    const rows = await prisma.productionOperation.groupBy({
      by: ["styleId"],
      where: { styleId: { in: ids } },
      _sum: { smv: true },
    });
    return new Map(rows.map((r) => [r.styleId, Number(r._sum.smv ?? 0)]));
  }

  private async lineContext(companyId: string, factoryId: string, from: Date, to: Date) {
    const [lines, holidays, allocs] = await Promise.all([
      prisma.line.findMany({
        where: { isActive: true, floor: { building: { factoryId } } },
        select: { id: true, code: true, name: true, operators: true, efficiencyPct: true, minutesPerDay: true },
        orderBy: { code: "asc" },
      }),
      prisma.factoryHoliday.findMany({
        where: { factoryId, date: { gte: from, lte: to } },
        select: { date: true, reason: true },
      }),
      prisma.ppcAllocation.findMany({
        where: { companyId, factoryId, status: { not: "CANCELLED" }, date: { gte: from, lte: to } },
        include: {
          productionOrder: {
            select: { productionNo: true, styleId: true, priority: true, style: { select: { styleNo: true } } },
          },
        },
        orderBy: [{ date: "asc" }],
      }),
    ]);
    const smv = await this.smvMap(allocs.map((a) => a.productionOrder.styleId));
    const cap = new Map(
      lines.map((l) => [
        l.id,
        lineMinutesPerDay({
          operators: l.operators,
          efficiencyPct: l.efficiencyPct === null ? null : Number(l.efficiencyPct),
          minutesPerDay: l.minutesPerDay,
        }),
      ])
    );
    return { lines, holidays, allocs, smv, cap };
  }

  // Open production order, jar allocation ekhono baki
  private async unplannedRows(where: Prisma.ProductionOrderWhereInput) {
    const pos = await prisma.productionOrder.findMany({
      where: { ...where, status: { in: [...OPEN] } },
      include: {
        style: { select: { styleNo: true, name: true } },
        order: { select: { orderNo: true } },
        factory: { select: { code: true } },
        line: { select: { code: true } },
      },
      orderBy: [{ priority: "asc" }, { startDate: "asc" }],
    });
    if (pos.length === 0) return [];
    const [sums, smv] = await Promise.all([
      prisma.ppcAllocation.groupBy({
        by: ["productionOrderId"],
        where: { productionOrderId: { in: pos.map((p) => p.id) }, status: { not: "CANCELLED" } },
        _sum: { plannedQty: true },
      }),
      this.smvMap(pos.map((p) => p.styleId)),
    ]);
    const allocated = new Map(sums.map((s) => [s.productionOrderId, s._sum.plannedQty ?? 0]));
    return pos
      .map((p) => {
        const a = allocated.get(p.id) ?? 0;
        return {
          id: p.id,
          productionNo: p.productionNo,
          orderNo: p.order.orderNo,
          styleNo: p.style.styleNo,
          styleName: p.style.name,
          factoryCode: p.factory.code,
          lineCode: p.line?.code ?? null,
          status: p.status,
          priority: p.priority,
          quantity: p.quantity,
          allocatedQty: a,
          remainingQty: remainingToPlan(p.quantity, a),
          startDate: p.startDate,
          endDate: p.endDate,
          smv: smv.get(p.styleId) ?? null,
        };
      })
      .filter((r) => r.remainingQty > 0);
  }

  // Allocation likhar por oi line-day-r warning (block kore na, shudhu janay)
  private async warningsFor(po: { factoryId: string; startDate: Date; endDate: Date }, a: { lineId: string; date: Date }) {
    const key = dateKey(a.date);
    const warnings: string[] = [];
    const [line, holiday, slot] = await Promise.all([
      prisma.line.findUnique({
        where: { id: a.lineId },
        select: { code: true, operators: true, efficiencyPct: true, minutesPerDay: true },
      }),
      prisma.factoryHoliday.findUnique({ where: { factoryId_date: { factoryId: po.factoryId, date: a.date } } }),
      prisma.ppcAllocation.findMany({
        where: { lineId: a.lineId, date: a.date, status: { not: "CANCELLED" } },
        include: { productionOrder: { select: { styleId: true, style: { select: { styleNo: true } } } } },
      }),
    ]);
    if (!line) return warnings;

    if (a.date < utcDay(po.startDate) || a.date > utcDay(po.endDate)) {
      warnings.push(`${key} is outside the production order dates (${dateKey(po.startDate)} to ${dateKey(po.endDate)})`);
    }
    const off = isOffDay(key, new Set(holiday ? [key] : []));
    if (off) warnings.push(`${key} is ${holiday ? `a factory holiday (${holiday.reason})` : "a weekly off day"}`);
    if (line.operators === null || line.operators <= 0) {
      warnings.push(`Line ${line.code} has no operator count, so its capacity is counted as 0`);
    }

    const smv = await this.smvMap(slot.map((s) => s.productionOrder.styleId));
    const missing = new Set<string>();
    let minutes = 0;
    for (const s of slot) {
      const v = smv.get(s.productionOrder.styleId);
      if (!v) missing.add(s.productionOrder.style.styleNo);
      else minutes += plannedMinutes(s.plannedQty, v);
    }
    for (const styleNo of missing) {
      warnings.push(`Style ${styleNo} has no operation bulletin (SMV), so its load is not counted`);
    }
    const available = off
      ? 0
      : lineMinutesPerDay({
          operators: line.operators,
          efficiencyPct: line.efficiencyPct === null ? null : Number(line.efficiencyPct),
          minutesPerDay: line.minutesPerDay,
        });
    if (isOverloaded(minutes, available)) {
      warnings.push(
        `Line ${line.code} is overloaded on ${key}: ${Math.round(minutes)} minutes planned, ${Math.round(available)} available`
      );
    }
    return warnings;
  }

  // ---------- দেখা ----------

  async formOptions() {
    const user = await this.guard("ppc.view");
    const scope = await this.scopeOf(user);
    const [factories, lines] = await Promise.all([
      prisma.factory.findMany({
        where: { companyId: user.companyId, id: { in: scope.factoryIds } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.line.findMany({
        where: { isActive: true, floor: { building: { factoryId: { in: scope.factoryIds } } } },
        select: { id: true, code: true, name: true, floor: { select: { building: { select: { factoryId: true } } } } },
        orderBy: { code: "asc" },
      }),
    ]);
    return {
      factories,
      lines: lines.map((l) => ({ id: l.id, code: l.code, name: l.name, factoryId: l.floor.building.factoryId })),
    };
  }

  // Confirmed order-er production order, jar plan baki
  async unplanned(filter: { factoryId?: string } = {}) {
    const user = await this.guard("ppc.view");
    const scope = await this.scopeOf(user);
    return this.unplannedRows({
      ...(await listFilter(user)),
      ...factoryWhere(scope),
      ...(filter.factoryId ? { factoryId: filter.factoryId } : {}),
    });
  }

  // Ek production order-er allocation list + summary (detail page-er jonno)
  async listForProductionOrder(productionOrderId: string) {
    const user = await this.guard("ppc.view");
    const po = await this.loadPo(user, productionOrderId);
    const rows = await prisma.ppcAllocation.findMany({
      where: { productionOrderId },
      include: { line: { select: { code: true, name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    const allocatedQty = rows.filter((r) => r.status !== "CANCELLED").reduce((s, r) => s + r.plannedQty, 0);
    return {
      productionOrderId,
      productionNo: po.productionNo,
      quantity: po.quantity,
      allocatedQty,
      remainingQty: remainingToPlan(po.quantity, allocatedQty),
      allocations: rows,
    };
  }

  // Planning board: line x din, allocation bar, overload
  async board(input: unknown) {
    const user = await this.guard("ppc.view");
    const d = rangeSchema.parse(input);
    const from = utcDay(d.from);
    const to = utcDay(d.to);
    if (to < from) throw new BusinessRuleError("The end date cannot be before the start date");
    if (spanDays(from, to) > 62) throw new BusinessRuleError("Please choose a range of at most 62 days for the board");
    await this.factory(user, d.factoryId);

    const ctx = await this.lineContext(user.companyId, d.factoryId, from, to);
    const holidayMap = new Map(ctx.holidays.map((h) => [dateKey(h.date), h.reason]));
    const holidaySet = new Set(holidayMap.keys());
    const keys = allKeys(from, to);

    const allocations = ctx.allocs.map((a) => ({
      id: a.id,
      productionOrderId: a.productionOrderId,
      productionNo: a.productionOrder.productionNo,
      styleNo: a.productionOrder.style.styleNo,
      lineId: a.lineId,
      dateKey: dateKey(a.date),
      plannedQty: a.plannedQty,
      status: a.status,
      minutes: Math.round(plannedMinutes(a.plannedQty, ctx.smv.get(a.productionOrder.styleId) ?? 0)),
    }));

    const loads = lineDayLoads(
      ctx.allocs.map((a) => ({
        lineId: a.lineId,
        dateKey: dateKey(a.date),
        plannedQty: a.plannedQty,
        smv: ctx.smv.get(a.productionOrder.styleId) ?? 0,
      }))
    );
    const loadMap = new Map(loads.map((l) => [`${l.lineId}|${l.dateKey}`, l]));

    const lines = ctx.lines.map((l) => {
      const perDay = ctx.cap.get(l.id) ?? 0;
      const cells: Record<string, { plannedQty: number; plannedMinutes: number; availableMinutes: number; overloaded: boolean }> = {};
      for (const k of keys) {
        const load = loadMap.get(`${l.id}|${k}`);
        const available = isOffDay(k, holidaySet) ? 0 : perDay;
        const planned = load?.plannedMinutes ?? 0;
        cells[k] = {
          plannedQty: load?.plannedQty ?? 0,
          plannedMinutes: Math.round(planned),
          availableMinutes: Math.round(available),
          overloaded: isOverloaded(planned, available),
        };
      }
      return { id: l.id, code: l.code, name: l.name, minutesPerDay: Math.round(perDay), missingData: l.operators === null, cells };
    });

    return {
      factoryId: d.factoryId,
      from,
      to,
      days: keys.map((k) => ({
        key: k,
        off: isOffDay(k, holidaySet),
        holiday: holidayMap.get(k) ?? null,
      })),
      lines,
      allocations,
    };
  }

  // Capacity vs load table (daily / weekly)
  async capacityTable(input: unknown) {
    const user = await this.guard("ppc.view");
    const d = tableSchema.parse(input);
    const from = utcDay(d.from);
    const to = utcDay(d.to);
    if (to < from) throw new BusinessRuleError("The end date cannot be before the start date");
    if (spanDays(from, to) > 366) throw new BusinessRuleError("Please choose a range of at most one year");
    await this.factory(user, d.factoryId);

    const ctx = await this.lineContext(user.companyId, d.factoryId, from, to);
    const holidaySet = new Set(ctx.holidays.map((h) => dateKey(h.date)));
    const available = new Map<string, number>();
    const planned = new Map<string, number>();
    const buckets = new Set<string>();

    for (const k of allKeys(from, to)) {
      const b = bucketKey(k, d.mode);
      buckets.add(b);
      if (isOffDay(k, holidaySet)) continue;
      for (const l of ctx.lines) {
        const id = `${l.id}|${b}`;
        available.set(id, (available.get(id) ?? 0) + (ctx.cap.get(l.id) ?? 0));
      }
    }
    for (const a of ctx.allocs) {
      const id = `${a.lineId}|${bucketKey(dateKey(a.date), d.mode)}`;
      planned.set(id, (planned.get(id) ?? 0) + plannedMinutes(a.plannedQty, ctx.smv.get(a.productionOrder.styleId) ?? 0));
    }

    const rows = [...buckets].sort().flatMap((b) =>
      ctx.lines.map((l) => {
        const av = available.get(`${l.id}|${b}`) ?? 0;
        const pl = planned.get(`${l.id}|${b}`) ?? 0;
        return {
          bucket: b,
          lineId: l.id,
          code: l.code,
          availableMinutes: Math.round(av),
          plannedMinutes: Math.round(pl),
          gapMinutes: Math.round(capacityGap(av, pl)),
          loadPct: loadPct(pl, av),
          overloaded: isOverloaded(pl, av),
          missingData: l.operators === null,
        };
      })
    );

    const totalAvailable = rows.reduce((s, r) => s + r.availableMinutes, 0);
    const totalPlanned = rows.reduce((s, r) => s + r.plannedMinutes, 0);

    // Je kaj-er allocation ekhono hoyni, tar required minute
    const un = await this.unplannedRows({
      companyId: user.companyId,
      factoryId: d.factoryId,
      startDate: { lte: to },
      endDate: { gte: from },
    });
    const unplannedMinutes = un.reduce((s, r) => s + (r.smv ? r.remainingQty * r.smv : 0), 0);

    return {
      factoryId: d.factoryId,
      from,
      to,
      mode: d.mode,
      rows,
      totals: {
        availableMinutes: totalAvailable,
        plannedMinutes: totalPlanned,
        unplannedMinutes: Math.round(unplannedMinutes),
        requiredMinutes: Math.round(totalPlanned + unplannedMinutes),
        gapMinutes: Math.round(capacityGap(totalAvailable, totalPlanned + unplannedMinutes)),
      },
      missingSmv: un.filter((r) => !r.smv).map((r) => ({ productionNo: r.productionNo, styleNo: r.styleNo })),
    };
  }

  // Alert feed-er jonno: aaj theke 30 dine overloaded line-day (alert.view diye)
  async overloadAlerts() {
    const user = await this.guard("alert.view");
    const scope = await this.scopeOf(user);
    const from = utcDay(new Date());
    const to = new Date(from.getTime() + 30 * DAY_MS);

    const allocs = await prisma.ppcAllocation.findMany({
      where: {
        companyId: user.companyId,
        factoryId: { in: scope.factoryIds },
        status: { not: "CANCELLED" },
        date: { gte: from, lte: to },
      },
      include: { productionOrder: { select: { styleId: true } } },
    });
    if (allocs.length === 0) return [];

    const [lines, holidays, smv] = await Promise.all([
      prisma.line.findMany({
        where: { id: { in: [...new Set(allocs.map((a) => a.lineId))] } },
        select: { id: true, code: true, operators: true, efficiencyPct: true, minutesPerDay: true },
      }),
      prisma.factoryHoliday.findMany({
        where: { factoryId: { in: scope.factoryIds }, date: { gte: from, lte: to } },
        select: { factoryId: true, date: true },
      }),
      this.smvMap(allocs.map((a) => a.productionOrder.styleId)),
    ]);
    const holidaySet = new Set(holidays.map((h) => `${h.factoryId}|${dateKey(h.date)}`));
    const lineById = new Map(lines.map((l) => [l.id, l]));
    const factoryOfLine = new Map(allocs.map((a) => [a.lineId, a.factoryId]));

    const loads = lineDayLoads(
      allocs.map((a) => ({
        lineId: a.lineId,
        dateKey: dateKey(a.date),
        plannedQty: a.plannedQty,
        smv: smv.get(a.productionOrder.styleId) ?? 0,
      }))
    );

    // line-day wise available (off day-te 0)
    const out: {
      lineId: string;
      lineCode: string;
      factoryId: string;
      dateKey: string;
      plannedMinutes: number;
      availableMinutes: number;
      overByMinutes: number;
    }[] = [];
    for (const l of loads) {
      const line = lineById.get(l.lineId);
      const factoryId = factoryOfLine.get(l.lineId);
      if (!line || !factoryId) continue;
      const off = isOffDay(l.dateKey, new Set(holidaySet.has(`${factoryId}|${l.dateKey}`) ? [l.dateKey] : []));
      const perDay = lineMinutesPerDay({
        operators: line.operators,
        efficiencyPct: line.efficiencyPct === null ? null : Number(line.efficiencyPct),
        minutesPerDay: line.minutesPerDay,
      });
      const over = overloadedLineDays([l], new Map([[l.lineId, off ? 0 : perDay]]));
      if (over.length > 0) {
        out.push({
          lineId: l.lineId,
          lineCode: line.code,
          factoryId,
          dateKey: l.dateKey,
          plannedMinutes: Math.round(l.plannedMinutes),
          availableMinutes: Math.round(over[0].availableMinutes),
          overByMinutes: Math.round(over[0].overByMinutes),
        });
      }
    }
    return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }

  // ---------- Allocation: create / edit(move) / release / cancel ----------

  async allocate(input: unknown) {
    const user = await this.guard("ppc.plan");
    const d = allocateSchema.parse(input);
    const date = utcDay(d.date);
    const po = await this.loadPo(user, d.productionOrderId);
    this.assertPoOpen(po.status);
    await this.assertLineInFactory(d.lineId, po.factoryId);

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `ppc:${po.id}`);
      await this.assertWithinQty(tx, po.id, po.quantity, d.plannedQty);
      const existing = await tx.ppcAllocation.findUnique({
        where: { productionOrderId_lineId_date: { productionOrderId: po.id, lineId: d.lineId, date } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new BusinessRuleError("This production order already has an allocation on this line and day. Edit it instead");
      }
      if (existing) {
        // Cancelled slot abar byabohar
        return tx.ppcAllocation.update({
          where: { id: existing.id },
          data: { status: "PLANNED", plannedQty: d.plannedQty, remarks: d.remarks, createdById: user.id },
        });
      }
      return tx.ppcAllocation.create({
        data: {
          companyId: po.companyId,
          factoryId: po.factoryId,
          productionOrderId: po.id,
          lineId: d.lineId,
          date,
          plannedQty: d.plannedQty,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "PpcAllocation", entityId: row.id, after: row });
    return { allocation: row, warnings: await this.warningsFor(po, row) };
  }

  // Shudhu PLANNED allocation edit/move kora jay (qty, line, date, remarks)
  async update(id: string, input: unknown) {
    const user = await this.guard("ppc.plan");
    const d = updateSchema.parse(input);
    const before = await this.loadAllocation(user, id);
    if (before.status !== "PLANNED") {
      throw new BusinessRuleError("Only a Planned allocation can be edited. Cancel a released one and plan again");
    }
    const po = await this.loadPo(user, before.productionOrderId);
    this.assertPoOpen(po.status);

    const lineId = d.lineId ?? before.lineId;
    const date = d.date ? utcDay(d.date) : before.date;
    const qty = d.plannedQty ?? before.plannedQty;
    if (lineId !== before.lineId) await this.assertLineInFactory(lineId, po.factoryId);

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `ppc:${po.id}`);
      if (qty !== before.plannedQty) await this.assertWithinQty(tx, po.id, po.quantity, qty, id);
      if (lineId !== before.lineId || dateKey(date) !== dateKey(before.date)) {
        const other = await tx.ppcAllocation.findUnique({
          where: { productionOrderId_lineId_date: { productionOrderId: po.id, lineId, date } },
        });
        if (other && other.id !== id) {
          if (other.status !== "CANCELLED") {
            throw new BusinessRuleError("This production order already has an allocation on that line and day");
          }
          await tx.ppcAllocation.delete({ where: { id: other.id } }); // purano cancelled slot
        }
      }
      return tx.ppcAllocation.update({
        where: { id },
        data: { lineId, date, plannedQty: qty, ...(d.remarks !== undefined ? { remarks: d.remarks } : {}) },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "UPDATE", entity: "PpcAllocation", entityId: id, before, after: row });
    return { allocation: row, warnings: await this.warningsFor(po, row) };
  }

  async release(id: string) {
    const user = await this.guard("ppc.release");
    const before = await this.loadAllocation(user, id);
    assertTransition(ppcAllocationTransitions, before.status, "RELEASED");
    const po = await this.loadPo(user, before.productionOrderId);
    this.assertPoOpen(po.status);

    const row = await prisma.ppcAllocation.update({ where: { id }, data: { status: "RELEASED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PpcAllocation", entityId: id,
      before: { status: before.status }, after: { status: row.status },
    });
    return row;
  }

  // Released allocation cancel korte ppc.release permission lage
  async cancel(id: string, reason: string) {
    const user = await this.guard("ppc.plan");
    assertRejectionReason(reason);
    const before = await this.loadAllocation(user, id);
    assertTransition(ppcAllocationTransitions, before.status, "CANCELLED");
    if (before.status === "RELEASED" && !can(user, "ppc.release")) {
      throw new BusinessRuleError("Cancelling a released allocation needs the release permission");
    }
    const row = await prisma.ppcAllocation.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PpcAllocation", entityId: id,
      before: { status: before.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // ---------- Factory holiday ----------

  async listHolidays(input: unknown) {
    const user = await this.guard("ppc.view");
    const d = rangeSchema.parse(input);
    await this.factory(user, d.factoryId);
    return prisma.factoryHoliday.findMany({
      where: { factoryId: d.factoryId, date: { gte: utcDay(d.from), lte: utcDay(d.to) } },
      orderBy: { date: "asc" },
    });
  }

  async addHoliday(input: unknown) {
    const user = await this.guard("ppc.plan");
    const d = holidaySchema.parse(input);
    const f = await this.factory(user, d.factoryId);
    const date = utcDay(d.date);
    const dup = await prisma.factoryHoliday.findUnique({ where: { factoryId_date: { factoryId: f.id, date } } });
    if (dup) throw new BusinessRuleError("This day is already marked as a holiday");
    const row = await prisma.factoryHoliday.create({
      data: { companyId: f.companyId, factoryId: f.id, date, reason: d.reason, createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "FactoryHoliday", entityId: row.id, after: row });
    return row;
  }

  async removeHoliday(id: string) {
    const user = await this.guard("ppc.plan");
    const h = found(await prisma.factoryHoliday.findUnique({ where: { id } }), "Holiday");
    await assertRecordInScope(user, h.companyId);
    assertFactoryInScope(await this.scopeOf(user), h.factoryId);
    await prisma.factoryHoliday.delete({ where: { id } });
    await this.audit({ user, action: "DELETE", entity: "FactoryHoliday", entityId: id, before: h });
    return { id };
  }
}

export const ppcService = new PpcService();
