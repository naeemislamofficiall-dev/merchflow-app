import { prisma } from "@/lib/prisma";
import { classifyTask } from "@/lib/tna-risk";
import { scoreOrder, type RiskResult } from "@/lib/order-risk";
import { BaseService } from "./base.service";

const ACTIVE = ["CONFIRMED", "IN_PRODUCTION", "PARTIALLY_SHIPPED"] as const;
const DAY = 86_400_000;

export type OrderRiskRow = RiskResult & { orderId: string; orderNo: string; buyer: string; shipDate: Date | null };

// "AI layer" ekhane = explainable, rule-based. Number/reason shob database theke.
class AiInsightsService extends BaseService {
  async orderRisks(): Promise<OrderRiskRow[]> {
    const user = await this.guard("ai.view");
    const now = new Date();
    const orders = await prisma.order.findMany({
      where: { companyId: user.companyId, status: { in: [...ACTIVE] } },
      include: { buyer: { select: { name: true } } },
      take: 300,
    });
    if (orders.length === 0) return [];
    const ids = orders.map((o) => o.id);

    const [tasks, poLines, prods, aql] = await Promise.all([
      prisma.tnaTask.findMany({
        where: { plan: { orderId: { in: ids } }, status: { notIn: ["COMPLETED", "WAIVED"] } },
        include: { plan: { select: { orderId: true, shipDate: true } }, dependsOn: { select: { status: true } } },
      }),
      prisma.purchaseOrderLine.findMany({
        where: { orderId: { in: ids }, po: { status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } } },
        select: { orderId: true, po: { select: { followUps: { select: { delayDays: true, actualReceiptDate: true } } } } },
      }),
      prisma.productionOrder.findMany({
        where: { orderId: { in: ids }, status: { not: "CANCELLED" } },
        select: { orderId: true, quantity: true, completedQty: true },
      }),
      prisma.aqlInspection.findMany({
        where: { orderId: { in: ids }, stage: { in: ["FINAL", "PRESHIPMENT"] } },
        orderBy: { createdAt: "desc" },
        select: { orderId: true, result: true },
      }),
    ]);

    const rows = orders.map((o) => {
      const myTasks = tasks.filter((t) => t.plan.orderId === o.id);
      const overdue = myTasks
        .map((t) => ({ t, lvl: classifyTask({ ...t, dependsOnStatus: t.dependsOn?.status ?? null }, t.plan.shipDate, now) }))
        .filter((x) => x.lvl === "OVERDUE" || x.lvl === "SHIPMENT_RISK");
      const lateDays = overdue.map(({ t }) => Math.max(0, Math.round((now.getTime() - (t.revisedDate ?? t.plannedDate).getTime()) / DAY)));

      const lateLines = poLines
        .filter((l) => l.orderId === o.id)
        .map((l) => Math.max(0, ...l.po.followUps.filter((f) => !f.actualReceiptDate).map((f) => f.delayDays)))
        .filter((d) => d > 0);

      const myProds = prods.filter((p) => p.orderId === o.id);
      const qty = myProds.reduce((s, p) => s + p.quantity, 0);
      const done = myProds.reduce((s, p) => s + p.completedQty, 0);

      const latestAql = aql.find((a) => a.orderId === o.id);

      const result = scoreOrder({
        daysToShip: o.shipDate ? Math.round((o.shipDate.getTime() - now.getTime()) / DAY) : null,
        overdueTna: overdue.length,
        maxTnaLateDays: Math.max(0, ...lateDays),
        latePoLines: lateLines.length,
        maxPoDelayDays: Math.max(0, ...lateLines),
        hasProduction: myProds.length > 0,
        producedPct: qty > 0 ? (done / qty) * 100 : null,
        finalInspectionFailed: latestAql?.result === "FAIL",
      });
      return { ...result, orderId: o.id, orderNo: o.orderNo, buyer: o.buyer.name, shipDate: o.shipDate };
    });
    return rows.sort((a, b) => b.score - a.score);
  }

  // Management brief: sudhu gona o tothyo, kono onumaan nai
  async brief() {
    const user = await this.guard("ai.view");
    const risks = await this.orderRisks();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + DAY);

    const [lateSuppliers, failedAql, todaysLogs, expiredCerts] = await Promise.all([
      prisma.poFollowUp.findMany({
        where: { delayDays: { gt: 0 }, actualReceiptDate: null, po: { companyId: user.companyId } },
        select: { po: { select: { supplierId: true } } },
      }),
      prisma.aqlInspection.count({
        where: { companyId: user.companyId, result: "FAIL", createdAt: { gte: new Date(today.getTime() - 7 * DAY) } },
      }),
      prisma.sewingLog.groupBy({
        by: ["lineId"],
        where: { companyId: user.companyId, logDate: { gte: today, lt: tomorrow } },
        _sum: { target: true, output: true },
      }),
      prisma.certificate.count({ where: { companyId: user.companyId, expiryDate: { lt: today } } }),
    ]);

    const linesBelow = todaysLogs.filter((l) => (l._sum.target ?? 0) > 0 && (l._sum.output ?? 0) < (l._sum.target ?? 0) * 0.8);
    return {
      date: today,
      activeOrders: risks.length,
      high: risks.filter((r) => r.level === "HIGH"),
      medium: risks.filter((r) => r.level === "MEDIUM").length,
      lateSupplierCount: new Set(lateSuppliers.map((l) => l.po.supplierId)).size,
      failedAqlLast7Days: failedAql,
      linesReporting: todaysLogs.length,
      linesBelow80Pct: linesBelow.length,
      expiredCerts,
    };
  }
}

export const aiInsightsService = new AiInsightsService();
