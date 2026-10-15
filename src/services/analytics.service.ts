import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { daysBetween, listFilter, startOfDay } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const r2 = (n: number) => Math.round(n * 100) / 100;
const xr = (v: unknown) => (v === null || v === undefined ? 1 : Number(v));
const EPS = 0.00005;
const ISSUED_PO = ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT", "COMPLETE", "CLOSED"] as const;
const OPEN_PO = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] as const;

function dateRange(r: { from?: Date; to?: Date }) {
  if (!r.from && !r.to) return undefined;
  return { ...(r.from ? { gte: r.from } : {}), ...(r.to ? { lte: r.to } : {}) };
}

// রিপোর্টগুলো সারির তালিকা ফেরত দেয়। Excel/PDF export আসবে ধাপ ড-তে।
// Production, Quality, Shipment, Finance রিপোর্ট আসবে ওই মডিউলের সাথে।
class AnalyticsService extends BaseService {
  // ---------- Merchandising ----------

  async buyerOrderReport(input: unknown = {}) {
    const user = await this.guard("analytics.view");
    const r = rangeSchema.parse(input);
    const orders = await prisma.order.findMany({
      where: { ...(await listFilter(user)), status: { not: "DRAFT" }, orderDate: dateRange(r) },
      include: { buyer: { select: { name: true } }, lines: true },
    });
    const map = new Map<string, {
      buyerId: string; buyer: string; orders: number; units: number; value: number;
      byStatus: Record<string, number>;
    }>();
    for (const o of orders) {
      const row = map.get(o.buyerId) ?? {
        buyerId: o.buyerId, buyer: o.buyer.name, orders: 0, units: 0, value: 0, byStatus: {},
      };
      row.orders++;
      for (const l of o.lines) {
        row.units += l.quantity;
        row.value += l.quantity * Number(l.unitPrice) * xr(o.exchangeRate);
      }
      row.byStatus[o.status] = (row.byStatus[o.status] ?? 0) + 1;
      map.set(o.buyerId, row);
    }
    return [...map.values()].map((x) => ({ ...x, value: r2(x.value) })).sort((a, b) => b.value - a.value);
  }

  async styleStatusReport() {
    const user = await this.guard("analytics.view");
    const rows = await prisma.style.groupBy({
      by: ["status"],
      where: await listFilter(user),
      _count: { _all: true },
    });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  }

  async tnaReport() {
    const user = await this.guard("analytics.view");
    const plans = await prisma.tnaPlan.findMany({
      where: await listFilter(user),
      include: {
        tasks: true,
        style: { select: { styleNo: true } },
        order: { select: { orderNo: true } },
      },
      orderBy: { shipDate: "asc" },
    });
    return plans.map((p) => {
      const byStatus: Record<string, number> = {};
      for (const t of p.tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      return {
        planId: p.id,
        style: p.style.styleNo,
        order: p.order?.orderNo ?? null,
        shipDate: p.shipDate,
        tasks: p.tasks.length,
        byStatus,
        maxDelayDays: p.tasks.reduce((m, t) => Math.max(m, t.delayDays), 0),
      };
    });
  }

  // রাউন্ড কয়টা লাগল, কত দিনে অনুমোদন হলো, প্রথমবারেই পাস হলো কিনা
  async sampleApprovalReport(input: unknown = {}) {
    const user = await this.guard("analytics.view");
    const r = rangeSchema.parse(input);
    const samples = await prisma.sampleRequest.findMany({
      where: { ...(await listFilter(user)), requestedDate: dateRange(r) },
      include: { approvals: { orderBy: { round: "asc" } }, style: { select: { styleNo: true } } },
      orderBy: { requestedDate: "desc" },
    });
    const rows = samples.map((s) => {
      const lastAp = s.approvals[s.approvals.length - 1];
      return {
        sampleNo: s.sampleNo,
        style: s.style.styleNo,
        type: s.sampleType,
        status: s.status,
        rounds: s.approvals.length,
        revisionCount: s.revisionCount,
        daysToDecision: lastAp ? daysBetween(startOfDay(s.requestedDate), startOfDay(lastAp.decidedAt)) : null,
        firstTimeApproved: s.approvals.length === 1 && s.approvals[0].decision === "APPROVED",
      };
    });
    const decided = rows.filter((x) => x.rounds > 0);
    return {
      rows,
      firstTimeApprovalPct: decided.length
        ? r2((decided.filter((x) => x.firstTimeApproved).length / decided.length) * 100)
        : null,
    };
  }

  async orderAmendmentReport(input: unknown = {}) {
    const user = await this.guard("analytics.view");
    const r = rangeSchema.parse(input);
    const list = await prisma.orderAmendment.findMany({
      where: { order: await listFilter(user), createdAt: dateRange(r) },
      include: { order: { select: { orderNo: true, buyer: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return list.map((a) => ({
      orderNo: a.order.orderNo,
      buyer: a.order.buyer.name,
      amendmentNo: a.amendmentNo,
      reason: a.reason,
      previousValues: a.previousValues,
      createdAt: a.createdAt,
    }));
  }

  // ---------- Procurement ----------

  async supplierPurchaseReport(input: unknown = {}) {
    const user = await this.guard("analytics.view");
    const r = rangeSchema.parse(input);
    const pos = await prisma.purchaseOrder.findMany({
      where: { ...(await listFilter(user)), status: { in: [...ISSUED_PO] }, createdAt: dateRange(r) },
      include: { supplier: { select: { name: true } } },
    });
    const map = new Map<string, { supplierId: string; supplier: string; pos: number; total: number }>();
    for (const p of pos) {
      const row = map.get(p.supplierId) ?? { supplierId: p.supplierId, supplier: p.supplier.name, pos: 0, total: 0 };
      row.pos++;
      row.total += Number(p.baseTotal ?? 0);
      map.set(p.supplierId, row);
    }
    return [...map.values()].map((x) => ({ ...x, total: r2(x.total) })).sort((a, b) => b.total - a.total);
  }

  async supplierDelayReport() {
    const user = await this.guard("analytics.view");
    const list = await prisma.poFollowUp.findMany({
      where: { po: await listFilter(user) },
      include: { po: { select: { supplierId: true, supplier: { select: { name: true } } } } },
    });
    const map = new Map<string, {
      supplierId: string; supplier: string; followUps: number; delayed: number; delaySum: number;
    }>();
    for (const f of list) {
      const row = map.get(f.po.supplierId) ?? {
        supplierId: f.po.supplierId, supplier: f.po.supplier.name, followUps: 0, delayed: 0, delaySum: 0,
      };
      row.followUps++;
      if (f.delayDays > 0) { row.delayed++; row.delaySum += f.delayDays; }
      map.set(f.po.supplierId, row);
    }
    return [...map.values()]
      .map((x) => ({
        supplierId: x.supplierId, supplier: x.supplier, followUps: x.followUps, delayed: x.delayed,
        avgDelayDays: x.delayed ? r2(x.delaySum / x.delayed) : 0,
      }))
      .sort((a, b) => b.avgDelayDays - a.avgDelayDays);
  }

  // মাস ধরে খরচ (বেস মুদ্রায়)
  async purchaseSpendReport(input: unknown = {}) {
    const user = await this.guard("analytics.view");
    const r = rangeSchema.parse(input);
    const pos = await prisma.purchaseOrder.findMany({
      where: { ...(await listFilter(user)), status: { in: [...ISSUED_PO] }, createdAt: dateRange(r) },
      select: { baseTotal: true, createdAt: true },
    });
    const byMonth = new Map<string, number>();
    for (const p of pos) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(p.baseTotal ?? 0));
    }
    return [...byMonth.entries()]
      .map(([month, spend]) => ({ month, spend: r2(spend) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async openPoReport() {
    const user = await this.guard("analytics.view");
    const pos = await prisma.purchaseOrder.findMany({
      where: { ...(await listFilter(user)), status: { in: [...OPEN_PO] } },
      include: { supplier: { select: { name: true } }, lines: true },
      orderBy: { deliveryDate: "asc" },
    });
    return pos.map((p) => {
      let ordered = 0;
      let remaining = 0;
      let orderedQty = 0;
      let receivedQty = 0;
      for (const l of p.lines) {
        const q = Number(l.quantity);
        const got = Number(l.receivedQty);
        ordered += q * Number(l.rate) * xr(p.exchangeRate);
        remaining += Math.max(q - got, 0) * Number(l.rate) * xr(p.exchangeRate);
        orderedQty += q;
        receivedQty += got;
      }
      return {
        poId: p.id, poNo: p.poNo, supplier: p.supplier.name, status: p.status,
        deliveryDate: p.deliveryDate,
        orderedValue: r2(ordered), remainingValue: r2(remaining),
        receivedPct: orderedQty ? r2((receivedQty / orderedQty) * 100) : 0,
      };
    });
  }

  // ---------- Inventory ----------

  // লট ধরে স্টকের বয়স
  async stockAging() {
    const user = await this.guard("analytics.view");
    const where = await listFilter(user);
    const rows = await prisma.stockTransaction.groupBy({
      by: ["lotId"],
      where: { ...where, lotId: { not: null } },
      _sum: { quantity: true },
    });
    const positive = rows.filter((r) => r.lotId && Number(r._sum.quantity ?? 0) > EPS);
    const lots = await prisma.inventoryLot.findMany({
      where: { id: { in: positive.map((r) => r.lotId as string) } },
      include: { material: { select: { code: true, name: true, unit: true } } },
    });
    const today = startOfDay(new Date());
    return positive
      .map((r) => {
        const lot = lots.find((l) => l.id === r.lotId)!;
        const age = daysBetween(startOfDay(lot.createdAt), today);
        return {
          lotId: lot.id, lotNo: lot.lotNo, material: `${lot.material.code} ${lot.material.name}`,
          unit: lot.material.unit, onHand: Number(r._sum.quantity ?? 0), ageDays: age,
          bucket: age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "90+",
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays);
  }

  async rollStock() {
    const user = await this.guard("analytics.view");
    const where = await listFilter(user);
    const rows = await prisma.stockTransaction.groupBy({
      by: ["rollId"],
      where: { ...where, rollId: { not: null } },
      _sum: { quantity: true },
    });
    const positive = rows.filter((r) => r.rollId && Number(r._sum.quantity ?? 0) > EPS);
    const rolls = await prisma.fabricRoll.findMany({
      where: { id: { in: positive.map((r) => r.rollId as string) } },
      include: { material: { select: { code: true, name: true } }, lot: { select: { lotNo: true } } },
    });
    return positive.map((r) => {
      const roll = rolls.find((x) => x.id === r.rollId)!;
      return {
        rollNo: roll.rollNo, material: `${roll.material.code} ${roll.material.name}`,
        lotNo: roll.lot.lotNo, color: roll.color, inspection: roll.inspectionStatus,
        onHand: Number(r._sum.quantity ?? 0),
      };
    });
  }

  // যে মাল স্টকে আছে কিন্তু N দিন ধরে ইস্যু হয়নি
  async slowMoving(days = 90) {
    const user = await this.guard("analytics.view");
    const where = await listFilter(user);
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const bal = await prisma.stockTransaction.groupBy({
      by: ["materialId"], where, _sum: { quantity: true },
    });
    const last = await prisma.stockTransaction.groupBy({
      by: ["materialId"], where: { ...where, type: "ISSUE" }, _max: { createdAt: true },
    });
    const lastBy = new Map(last.map((l) => [l.materialId, l._max.createdAt]));
    const stale = bal.filter((b) => {
      if (Number(b._sum.quantity ?? 0) <= EPS) return false;
      const l = lastBy.get(b.materialId);
      return !l || l < cutoff;
    });
    const mats = await prisma.material.findMany({ where: { id: { in: stale.map((s) => s.materialId) } } });
    return stale.map((s) => {
      const m = mats.find((x) => x.id === s.materialId)!;
      const l = lastBy.get(s.materialId) ?? null;
      return {
        materialId: m.id, code: m.code, name: m.name, unit: m.unit,
        onHand: Number(s._sum.quantity ?? 0), lastIssueAt: l,
        daysSinceIssue: l ? daysBetween(startOfDay(l), startOfDay(new Date())) : null,
      };
    });
  }

  // মূল্য = হাতের পরিমাণ × গড় ক্রয়মূল্য (এ পর্যন্ত যত মাল এসেছে তার ওজনে গড়, বেস মুদ্রায়)
  async stockValuation() {
    const user = await this.guard("analytics.view");
    const where = await listFilter(user);
    const bal = await prisma.stockTransaction.groupBy({
      by: ["materialId"], where, _sum: { quantity: true },
    });
    const positive = bal.filter((b) => Number(b._sum.quantity ?? 0) > EPS);
    const ids = positive.map((b) => b.materialId);

    const lines = await prisma.purchaseOrderLine.findMany({
      where: { materialId: { in: ids }, receivedQty: { gt: 0 }, po: where },
      select: { materialId: true, receivedQty: true, rate: true, po: { select: { exchangeRate: true } } },
    });
    const cost = new Map<string, { qty: number; value: number }>();
    for (const l of lines) {
      const c = cost.get(l.materialId) ?? { qty: 0, value: 0 };
      c.qty += Number(l.receivedQty);
      c.value += Number(l.receivedQty) * Number(l.rate) * xr(l.po.exchangeRate);
      cost.set(l.materialId, c);
    }
    const mats = await prisma.material.findMany({ where: { id: { in: ids } } });

    const rows = positive.map((b) => {
      const m = mats.find((x) => x.id === b.materialId)!;
      const c = cost.get(b.materialId);
      const avg = c && c.qty > 0 ? c.value / c.qty : 0;
      const onHand = Number(b._sum.quantity ?? 0);
      return {
        materialId: m.id, code: m.code, name: m.name, unit: m.unit,
        onHand, avgCost: r2(avg), value: r2(onHand * avg), hasCost: avg > 0,
      };
    });
    return { rows, totalValue: r2(rows.reduce((s, x) => s + x.value, 0)) };
  }
}

export const analyticsService = new AnalyticsService();