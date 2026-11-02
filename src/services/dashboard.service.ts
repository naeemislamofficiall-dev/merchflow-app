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

    const shipmentOverdue = await prisma.order.count({
      where: { ...where, status: { in: ["CONFIRMED", "IN_PRODUCTION"] }, shipDate: { lt: now } },
    });
    return {
      openOrders,
      tnaRisk, // দেরি বা ঝুঁকিতে থাকা milestone
      sampleDelays,
      materialBookingPending: shortageRuns,
      buyerApprovals, // বায়ারের সিদ্ধান্তের অপেক্ষায় sample
      shipmentRisk,
      shipmentOverdue, // ১৪ দিনের মধ্যে (বা পেরিয়ে যাওয়া) শিপমেন্টের অর্ডার
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

    // Dashboard-er Recent Orders table
  async recentOrders(take = 5) {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const orders = await prisma.order.findMany({
      where: { ...where, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take,
      include: { buyer: { select: { name: true } }, lines: { select: { quantity: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? "-",
      status: o.status as string,
      qty: o.lines.reduce((s, l) => s + l.quantity, 0),
      shipDate: o.shipDate as Date | null,
    }));
  }
  
    // Order Progress donut: status onujayi order count
  async orderProgress() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const rows = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { ...where, status: { not: "CANCELLED" } },
    });
    return rows.map((r) => ({ status: r.status as string, count: r._count._all }));
  }

  // Top buyers by order value (base currency)
  async topBuyers(take = 5) {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const orders = await prisma.order.findMany({
      where: { ...where, status: { notIn: ["DRAFT", "CANCELLED"] } },
      include: {
        buyer: { select: { name: true } },
        lines: { select: { quantity: true, unitPrice: true } },
      },
    });
    const byBuyer = new Map<string, number>();
    for (const o of orders) {
      const name = o.buyer?.name ?? "-";
      const value =
        o.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0) * rateOf(o.exchangeRate);
      byBuyer.set(name, (byBuyer.get(name) ?? 0) + value);
    }
    const total = [...byBuyer.values()].reduce((s, v) => s + v, 0);
    return [...byBuyer.entries()]
      .map(([name, value]) => ({
        name,
        value: r2(value),
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, take);
  }

  
    // Hero greeting + mash-ba-mash trend (ager mashe-r sathe tulona)
  async overview() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const now = new Date();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [me, company, orders] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
      prisma.company.findUnique({
        where: { id: user.companyId },
        select: { tradeName: true, legalName: true },
      }),
      prisma.order.findMany({
        where: { ...where, status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: prevStart } },
        include: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
    ]);

    const value = (o: (typeof orders)[number]) =>
      o.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0) * rateOf(o.exchangeRate);
        // mash-er prothom N din vs ager mash-er prothom N din
    const prevCut = new Date(
      Math.min(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate() + 1).getTime(), thisStart.getTime())
    );
    const cur = orders.filter((o) => o.createdAt >= thisStart);
    const prev = orders.filter((o) => o.createdAt >= prevStart && o.createdAt < prevCut);
    const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);

    return {
      nowIso: now.toISOString(),
      name: me?.name ?? null,
      company: company?.tradeName ?? company?.legalName ?? "-",
      ordersTrend: pct(cur.length, prev.length),
      valueTrend: pct(
        cur.reduce((s, o) => s + value(o), 0),
        prev.reduce((s, o) => s + value(o), 0)
      ),
    };
  }

  // Upcoming shipments + next T&A milestone + risk
  async upcomingShipments(take = 5) {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { ...where, status: { in: ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"] } },
      orderBy: { shipDate: "asc" },
      take,
      include: { buyer: { select: { name: true } } },
    });

    const plans = await prisma.tnaPlan.findMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    const next = new Map<string, { name: string; due: Date }>();
    for (const p of plans) {
      const t = p.tasks.find((x) => x.status !== "COMPLETED" && x.status !== "WAIVED");
      if (t && p.orderId) next.set(p.orderId, { name: t.name, due: t.revisedDate ?? t.plannedDate });
    }

    return orders.map((o) => {
      const daysLeft = o.shipDate
        ? Math.ceil((new Date(o.shipDate).getTime() - Date.now()) / DAY)
        : null;
      const m = next.get(o.id);
      const milestoneLate = !!m && m.due < startToday;
      const risk =
        daysLeft !== null && (daysLeft < 0 || (milestoneLate && daysLeft <= 14))
          ? "High"
          : milestoneLate
            ? "Medium"
            : "-";
      return {
        id: o.id,
        orderNo: o.orderNo,
        buyer: o.buyer?.name ?? "-",
        shipDate: o.shipDate as Date | null,
        daysLeft,
        milestone: m?.name ?? null,
        milestoneLate,
        risk,
      };
    });
  }

    // Production line performance: shesh 7 diner efficiency (line dhore)
  async lineWeek() {
    const user = await this.guard("dashboard.view");
    const where = { ...(await listFilter(user)), ...factoryWhere(await this.scopeOf(user)) };
    const from = toDateOnly(new Date(Date.now() - 6 * DAY));
    const rows = await prisma.sewingLog.groupBy({
      by: ["lineId"],
      _sum: { target: true, output: true },
      where: { ...where, logDate: { gte: from } },
    });
    const lines = await prisma.line.findMany({
      where: { id: { in: rows.map((r) => r.lineId) } },
      select: { id: true, code: true },
    });
    return rows
      .map((r) => {
        const target = r._sum.target ?? 0;
        const output = r._sum.output ?? 0;
        return {
          lineId: r.lineId,
          code: lines.find((l) => l.id === r.lineId)?.code ?? "-",
          target,
          output,
          efficiencyPct: target > 0 ? Math.round((output / target) * 100) : 0,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // Material & Procurement Watchlist: chalu PO line-er required vs received
  async watchlist(take = 6) {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const now = new Date();
    const lines = await prisma.purchaseOrderLine.findMany({
      where: { po: { ...where, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } } },
      include: {
        material: { select: { name: true } },
        po: { select: { id: true, poNo: true } },
      },
    });
    const followUps = await prisma.poFollowUp.findMany({
      where: {
        actualReceiptDate: null,
        po: { id: { in: [...new Set(lines.map((l) => l.po.id))] } },
      },
      include: { po: { select: { id: true } } },
    });
    const eta = new Map(followUps.map((f) => [f.po.id, f.latestPromisedDate]));

    const rank: Record<string, number> = { Shortage: 0, Delay: 1, "Low stock": 2, OK: 3 };
    return lines
      .map((l) => {
        const required = Number(l.quantity);
        const available = Number(l.receivedQty);
        const etaDate = eta.get(l.po.id) ?? null;
        const late = !!etaDate && etaDate < now;
        const status =
          available >= required
            ? "OK"
            : late
              ? "Delay"
              : required > 0 && available / required < 0.5
                ? "Shortage"
                : "Low stock";
        return {
          id: l.id,
          material: l.material.name,
          poNo: l.po.poNo,
          required,
          available,
          status,
          eta: etaDate,
        };
      })
      .sort((a, b) => rank[a.status] - rank[b.status])
      .slice(0, take);
  }

  // Monthly order value: shesh 6 mash
  async orderTrend() {
    const user = await this.guard("dashboard.view");
    const where = await listFilter(user);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await prisma.order.findMany({
      where: { ...where, status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: start } },
      include: { lines: { select: { quantity: true, unitPrice: true } } },
    });
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        value: 0,
      };
    });
    for (const o of orders) {
      const m = months.find((x) => x.key === `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`);
      if (m) {
        m.value +=
          o.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0) * rateOf(o.exchangeRate);
      }
    }
    return months.map((m) => ({ label: m.label, value: r2(m.value) }));
  }
  // Business insights: Receivables, Receivables vs Payables, Profitability
  // (shob permission-gated: ar.view / ap.view / profitability.view)
  async finance() {
    const user = await this.guard("dashboard.view");
    const scope = await listFilter(user);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const canAr = can(user, "ar.view");
    const canAp = can(user, "ap.view");
    const canProfit = can(user, "profitability.view");
    const live = ["POSTED", "PARTIALLY_PAID", "PAID"] as const;

    const [arOpen, arMonth, apMonth, revLines, costs] = await Promise.all([
      canAr
        ? prisma.buyerInvoice.findMany({
            where: { ...scope, status: { in: ["POSTED", "PARTIALLY_PAID"] } },
            select: { totalAmount: true, receivedAmount: true, exchangeRate: true, dueDate: true },
          })
        : null,
      canAr
        ? prisma.buyerInvoice.findMany({
            where: { ...scope, status: { in: [...live] }, invoiceDate: { gte: start } },
            select: { invoiceDate: true, totalAmount: true, exchangeRate: true },
          })
        : null,
      canAp
        ? prisma.supplierInvoice.findMany({
            where: { ...scope, status: { in: [...live] }, invoiceDate: { gte: start } },
            select: { invoiceDate: true, totalAmount: true, exchangeRate: true },
          })
        : null,
      canProfit
        ? prisma.buyerInvoiceLine.findMany({
            where: { invoice: { ...scope, status: { in: [...live] } } },
            select: { orderId: true, amount: true, invoice: { select: { exchangeRate: true } } },
          })
        : null,
      canProfit
        ? prisma.costAllocation.findMany({ where: scope, select: { orderId: true, amountBase: true } })
        : null,
    ]);

    // Receivables: buyer-er theke ekhono ja pabo
    const receivables = arOpen
      ? {
          outstanding: r2(
            arOpen.reduce(
              (s, i) => s + (Number(i.totalAmount) - Number(i.receivedAmount)) * rateOf(i.exchangeRate),
              0
            )
          ),
          overdue: arOpen.filter((i) => i.dueDate && i.dueDate < now).length,
        }
      : null;

    // Receivables vs Payables: shesh 6 mash
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        receivable: 0,
        payable: 0,
      };
    });
    for (const r of arMonth ?? []) {
      const d = new Date(r.invoiceDate);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.receivable += Number(r.totalAmount) * rateOf(r.exchangeRate);
    }
    for (const r of apMonth ?? []) {
      const d = new Date(r.invoiceDate);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.payable += Number(r.totalAmount) * rateOf(r.exchangeRate);
    }
    const trend =
      arMonth || apMonth
        ? months.map((m) => ({ label: m.label, receivable: r2(m.receivable), payable: r2(m.payable) }))
        : null;

    // Profitability: shudhu jei order-e posted invoice (revenue) ache
    let profitability: {
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
      hasCost: boolean;
    } | null = null;
    let topOrders: {
      orderId: string;
      orderNo: string;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
      sharePct: number;
    }[] = [];

    if (revLines && costs) {
      const rev = new Map<string, number>();
      for (const l of revLines) {
        rev.set(l.orderId, (rev.get(l.orderId) ?? 0) + Number(l.amount) * rateOf(l.invoice.exchangeRate));
      }
      const cost = new Map<string, number>();
      for (const c of costs) {
        if (c.orderId) cost.set(c.orderId, (cost.get(c.orderId) ?? 0) + Number(c.amountBase));
      }
      const ids = [...rev.keys()];
      const orders = ids.length
        ? await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNo: true } })
        : [];

      const rows = orders.map((o) => {
        const revenue = rev.get(o.id) ?? 0;
        const c = cost.get(o.id) ?? 0;
        const profit = revenue - c;
        return {
          orderId: o.id,
          orderNo: o.orderNo,
          revenue: r2(revenue),
          cost: r2(c),
          profit: r2(profit),
          marginPct: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
        };
      });

      const revenue = rows.reduce((s, r) => s + r.revenue, 0);
      const costTotal = rows.reduce((s, r) => s + r.cost, 0);
      const profit = revenue - costTotal;
      profitability = {
        revenue: r2(revenue),
        cost: r2(costTotal),
        profit: r2(profit),
        marginPct: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
        hasCost: costTotal > 0,
      };
      const totalProfit = rows.filter((r) => r.profit > 0).reduce((s, r) => s + r.profit, 0);
      topOrders = rows
        .filter((r) => r.profit > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)
        .map((r) => ({
          ...r,
          sharePct: totalProfit > 0 ? Math.round((r.profit / totalProfit) * 100) : 0,
        }));
    }

    return { receivables, trend, profitability, topOrders };
  }

    // Production overview / vs target: ajker log na thakle shesh log-er din dekhay
  async productionDay() {
    const user = await this.guard("dashboard.view");
    const where = { ...(await listFilter(user)), ...factoryWhere(await this.scopeOf(user)) };
    const latest = await prisma.sewingLog.findFirst({
      where,
      orderBy: { logDate: "desc" },
      select: { logDate: true },
    });
    if (!latest) return null;

    const rows = await prisma.sewingLog.groupBy({
      by: ["lineId"],
      _sum: { target: true, output: true },
      where: { ...where, logDate: latest.logDate },
    });
    const lines = await prisma.line.findMany({
      where: { id: { in: rows.map((r) => r.lineId) } },
      select: { id: true, code: true },
    });
    const today = toDateOnly(new Date());
    return {
      date: latest.logDate as Date,
      isToday: latest.logDate.getTime() === today.getTime(),
      lines: rows
        .map((r) => {
          const target = r._sum.target ?? 0;
          const output = r._sum.output ?? 0;
          return {
            lineId: r.lineId,
            code: lines.find((l) => l.id === r.lineId)?.code ?? "-",
            target,
            output,
            efficiencyPct: target > 0 ? Math.round((output / target) * 100) : 0,
          };
        })
        .sort((a, b) => a.code.localeCompare(b.code)),
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