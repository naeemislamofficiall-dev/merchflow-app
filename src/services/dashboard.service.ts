import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { hourEfficiency, summarizeHours } from "@/lib/production-calc";
import { factoryWhere } from "@/lib/scope";
import { listFilter } from "@/lib/service-helpers";
import { getBaseCurrency, toDateOnly } from "./currency.service";
import { aqlService } from "./aql.service";
import { capaService } from "./capa.service";
import { qualityService } from "./quality.service";
import { BaseService } from "./base.service";

const r2 = (n: number) => Math.round(n * 100) / 100;
const rateOf = (v: unknown) => (v === null || v === undefined ? 1 : Number(v));
const DAY = 86_400_000;

class DashboardService extends BaseService {
  // CEO / Owner
  async ceo() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const currency = await getBaseCurrency(user.companyId);

    const orders = await prisma.order.findMany({
      where: { ...where, status: { notIn: ["DRAFT", "CANCELLED"] } },
      include: { lines: true },
    });
    const orderValue = orders.reduce(
      (s, o) =>
        s + o.lines.reduce((x, l) => x + l.quantity * Number(l.unitPrice), 0) * rateOf(o.exchangeRate),
      0
    );

    // Material exposure = পাঠানো PO-র যে মাল এখনো আসেনি, তার মূল্য
    const poLines = await prisma.purchaseOrderLine.findMany({
      where: { po: { ...where, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } } },
      select: { quantity: true, receivedQty: true, rate: true, po: { select: { exchangeRate: true } } },
    });
    const exposure = poLines.reduce(
      (s, l) =>
        s + Math.max(Number(l.quantity) - Number(l.receivedQty), 0) * Number(l.rate) * rateOf(l.po.exchangeRate),
      0
    );

    return {
      currency,
      totalOrders: orders.length,
      openOrders: orders.filter((o) =>
        ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"].includes(o.status)
      ).length,
      orderValue: r2(orderValue),
      materialExposure: r2(exposure),
      notYetAvailable: [
        "productionValue", "shipmentValue", "onTimeShipmentPct",
        "buyerProfitability", "factoryEfficiency", "receivables",
      ],
    };
  }

  // Merchandising Head
  async merchandising() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * DAY);

    const [openOrders, tnaRisk, sampleDelays, buyerApprovals, shortageRuns, shipmentRisk] =
      await Promise.all([
        prisma.order.count({
          where: { ...where, status: { in: ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"] } },
        }),
        prisma.tnaTask.count({ where: { plan: where, status: { in: ["DELAYED", "AT_RISK"] } } }),
        prisma.sampleRequest.count({
          where: {
            ...where,
            dueDate: { lt: now },
            status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
          },
        }),
        prisma.sampleRequest.count({ where: { ...where, status: "BUYER_REVIEW" } }),
        // মাল বুকিং: MRP-তে ঘাটতি আছে কিন্তু এখনো PR হয়নি
        prisma.mrpRun.count({
          where: { ...where, purchaseRequisitions: { none: {} }, lines: { some: { netQty: { gt: 0 } } } },
        }),
        prisma.order.count({
          where: {
            ...where,
            status: { in: ["CONFIRMED", "IN_PRODUCTION"] },
            shipDate: { lte: in14 },
          },
        }),
      ]);

    return {
      openOrders,
      tnaRisk, // দেরি বা ঝুঁকিতে থাকা milestone
      sampleDelays,
      materialBookingPending: shortageRuns,
      buyerApprovals, // বায়ারের সিদ্ধান্তের অপেক্ষায় sample
      shipmentRisk, // ১৪ দিনের মধ্যে (বা পেরিয়ে যাওয়া) শিপমেন্টের অর্ডার
    };
  }

  // Procurement Head
  async procurement() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const currency = await getBaseCurrency(user.companyId);
    const issued = ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT", "COMPLETE", "CLOSED"] as const;

    const [openPr, openPo, delayed, shortageRuns, spendRows, followUps] = await Promise.all([
      prisma.purchaseRequisition.count({ where: { ...where, status: { in: ["SUBMITTED", "APPROVED"] } } }),
      prisma.purchaseOrder.count({
        where: {
          ...where,
          status: { in: ["SUBMITTED", "APPROVED", "SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] },
        },
      }),
      prisma.poFollowUp.findMany({
        where: {
          actualReceiptDate: null,
          latestPromisedDate: { lt: now },
          po: { ...where, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } },
        },
        include: { po: { select: { poNo: true, supplier: { select: { name: true } } } } },
        orderBy: { latestPromisedDate: "asc" },
      }),
      prisma.mrpRun.count({
        where: { ...where, purchaseRequisitions: { none: {} }, lines: { some: { netQty: { gt: 0 } } } },
      }),
      prisma.purchaseOrder.findMany({
        where: { ...where, status: { in: [...issued] }, createdAt: { gte: yearStart } },
        select: { baseTotal: true, createdAt: true },
      }),
      // Supplier performance: যে delivery শেষ হয়েছে
      prisma.poFollowUp.findMany({
        where: { actualReceiptDate: { not: null }, po: where },
        select: {
          supplierPromisedDate: true,
          actualReceiptDate: true,
          po: { select: { supplierId: true, supplier: { select: { name: true } } } },
        },
      }),
    ]);

    const spendMonth = spendRows
      .filter((p) => p.createdAt >= monthStart)
      .reduce((s, p) => s + Number(p.baseTotal ?? 0), 0);
    const spendYear = spendRows.reduce((s, p) => s + Number(p.baseTotal ?? 0), 0);

    const bySupplier = new Map<string, { name: string; total: number; onTime: number }>();
    for (const f of followUps) {
      const key = f.po.supplierId;
      const row = bySupplier.get(key) ?? { name: f.po.supplier.name, total: 0, onTime: 0 };
      row.total++;
      if (f.actualReceiptDate && f.actualReceiptDate <= f.supplierPromisedDate) row.onTime++;
      bySupplier.set(key, row);
    }
    const worstSuppliers = [...bySupplier.entries()]
      .map(([supplierId, v]) => ({
        supplierId, name: v.name, deliveries: v.total, onTimePct: r2((v.onTime / v.total) * 100),
      }))
      .sort((a, b) => a.onTimePct - b.onTimePct)
      .slice(0, 5);

    return {
      currency,
      openPr,
      openPo,
      supplierDelays: delayed.length,
      delayedList: delayed.slice(0, 5).map((f) => ({
        followUpId: f.id, poNo: f.po.poNo, supplier: f.po.supplier.name,
        promised: f.latestPromisedDate,
        daysLate: Math.floor((now.getTime() - f.latestPromisedDate.getTime()) / DAY),
      })),
      materialShortage: shortageRuns,
      spendThisMonth: r2(spendMonth),
      spendThisYear: r2(spendYear),
      worstSuppliers,
    };
  }

  // Factory, QA, Commercial: Production, Quality, Shipment আসলে এগুলো ভরবে
  // Factory Head: আজকের উৎপাদন, target vs actual, efficiency, rejection, লাইন ধরে পারফরম্যান্স
  async factory() {
    const user = await this.guard("dashboard.view");
    const where = { ...(await listFilter(user)), ...factoryWhere(await this.scopeOf(user)) };
    const today = toDateOnly(new Date());
    const [logs, openOrders, finishing] = await Promise.all([
      prisma.sewingLog.findMany({ where: { ...where, logDate: today }, include: { line: { select: { code: true } } } }),
      prisma.productionOrder.count({ where: { ...where, status: { in: ["RELEASED", "IN_PROGRESS", "PAUSED"] } } }),
      prisma.finishingLog.aggregate({ _sum: { outputQty: true }, where: { ...where, logDate: today } }),
    ]);
    const byLine = new Map<string, { code: string; target: number; output: number }>();
    for (const l of logs) {
      const row = byLine.get(l.lineId) ?? { code: l.line.code, target: 0, output: 0 };
      row.target += l.target;
      row.output += l.output;
      byLine.set(l.lineId, row);
    }
    return {
      available: true,
      today: summarizeHours(logs),
      finishingOutputToday: finishing._sum.outputQty ?? 0,
      openProductionOrders: openOrders,
      lines: [...byLine.entries()].map(([lineId, r]) => ({ lineId, ...r, efficiencyPct: hourEfficiency(r.target, r.output) })),
    };
  }

  // QA Head: DHU, Defect Pareto, AQL pass rate, CAPA pending (শেষ ৩০ দিন)
  async qa() {
    const user = await this.guard("dashboard.view");
    const from = new Date(Date.now() - 30 * DAY);
    const [quality, aql, capa] = await Promise.all([
      can(user, "qc.view") ? qualityService.summary({ from }) : null,
      can(user, "aql.view") ? aqlService.passRate(from) : null,
      can(user, "capa.view") ? capaService.pending() : null,
    ]);
    return {
      available: true,
      days: 30,
      dhu: quality?.dhu ?? null,
      defectPareto: quality?.pareto ?? [],
      checked: quality?.checked ?? 0,
      aqlPassRate: aql,
      capaPending: capa,
    };
  }

  // Commercial Head: শিপমেন্ট প্ল্যান, LC, Export document, হ্যান্ডওভার বাকি
  async commercial() {
    const user = await this.guard("dashboard.view");
    const where = { ...(await listFilter(user)), ...factoryWhere(await this.scopeOf(user)) };
    const company = await listFilter(user);
    const [plan, lcs, docs, pending] = await Promise.all([
      prisma.shipment.findMany({
        where: { ...where, status: { in: ["PLANNED", "DOCUMENTS_READY", "BOOKED"] } },
        orderBy: { plannedShipDate: "asc" },
        take: 20,
        select: { id: true, shipmentNo: true, status: true, plannedShipDate: true, destination: true },
      }),
      prisma.exportDocument.groupBy({ by: ["status"], _count: true, where: { ...company, docType: { in: ["LC", "BTB_LC"] } } }),
      prisma.exportDocument.groupBy({ by: ["status"], _count: true, where: company }),
      prisma.exportDocument.count({
        where: { ...company, status: { not: "HANDED_OVER" }, shipment: { status: { in: ["BOOKED", "SHIPPED"] } } },
      }),
    ]);
    return {
      available: true,
      shipmentPlan: plan,
      lcStatus: lcs.map((x) => ({ status: x.status, count: x._count })),
      exportDocuments: docs.map((x) => ({ status: x.status, count: x._count })),
      pendingHandover: pending,
       };
  }
}

export const dashboardService = new DashboardService();