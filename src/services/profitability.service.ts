import { prisma } from "@/lib/prisma";
import { grossMargin, round2 } from "@/lib/finance-calc";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const REVENUE_STATUSES = ["POSTED", "PARTIALLY_PAID", "PAID"] as const;

class ProfitabilityService extends BaseService {
  // একটা অর্ডারের স্টাইল ধরে Revenue / Cost / Margin (সব বেস কারেন্সিতে)
  async byOrder(orderId: string) {
    const user = await this.guard("profitability.view");
    const order = found(await prisma.order.findUnique({ where: { id: orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);

    const revLines = await prisma.buyerInvoiceLine.findMany({
      where: { orderId, invoice: { status: { in: [...REVENUE_STATUSES] } } },
      include: { invoice: { select: { exchangeRate: true } } },
    });
    const costs = await prisma.costAllocation.findMany({ where: { orderId } });

    const rows = new Map<string, { styleId: string | null; revenue: number; cost: number }>();
    const slot = (styleId: string | null) => {
      const key = styleId ?? "_unassigned";
      const cur = rows.get(key) ?? { styleId, revenue: 0, cost: 0 };
      rows.set(key, cur);
      return cur;
    };
    for (const l of revLines) slot(l.styleId).revenue += Number(l.amount) * Number(l.invoice.exchangeRate);
    for (const c of costs) slot(c.styleId).cost += Number(c.amountBase);

    const styles = [...rows.values()].map((r) => ({ styleId: r.styleId, ...grossMargin(r.revenue, r.cost) }));
    const totalRevenue = styles.reduce((s, r) => s + r.revenue, 0);
    const totalCost = styles.reduce((s, r) => s + r.cost, 0);
    return { orderId, buyerId: order.buyerId, styles, total: grossMargin(totalRevenue, totalCost) };
  }

  // Buyer → Order ধরে সারাংশ
  async byBuyer(buyerId?: string) {
    const user = await this.guard("profitability.view");
    const scope = await listFilter(user);

    const revLines = await prisma.buyerInvoiceLine.findMany({
      where: {
        invoice: { ...scope, status: { in: [...REVENUE_STATUSES] }, ...(buyerId ? { buyerId } : {}) },
      },
      include: { invoice: { select: { exchangeRate: true } } },
    });
    const costs = await prisma.costAllocation.findMany({ where: scope });

    const orderIds = [...new Set([...revLines.map((l) => l.orderId), ...costs.map((c) => c.orderId)])];
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, ...(buyerId ? { buyerId } : {}) },
      select: { id: true, orderNo: true, buyerId: true },
    });

    const perOrder = orders.map((o) => {
      const revenue = revLines
        .filter((l) => l.orderId === o.id)
        .reduce((s, l) => s + Number(l.amount) * Number(l.invoice.exchangeRate), 0);
      const cost = costs.filter((c) => c.orderId === o.id).reduce((s, c) => s + Number(c.amountBase), 0);
      return { orderId: o.id, orderNo: o.orderNo, buyerId: o.buyerId, ...grossMargin(revenue, cost) };
    });

    const buyers = new Map<string, { revenue: number; cost: number }>();
    for (const r of perOrder) {
      const cur = buyers.get(r.buyerId) ?? { revenue: 0, cost: 0 };
      cur.revenue += r.revenue;
      cur.cost += r.cost;
      buyers.set(r.buyerId, cur);
    }
    return {
      orders: perOrder,
      buyers: [...buyers.entries()].map(([id, v]) => ({
        buyerId: id,
        ...grossMargin(round2(v.revenue), round2(v.cost)),
      })),
    };
  }
}

export const profitabilityService = new ProfitabilityService();