import { prisma } from "@/lib/prisma";
import { listFilter } from "@/lib/service-helpers";
import type { RangeKey } from "@/components/profitability/types";
import { BaseService } from "./base.service";

const DAY = 86_400_000;
const LIVE = ["POSTED", "PARTIALLY_PAID", "PAID"] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

export const isRangeKey = (v: unknown): v is RangeKey =>
  v === "all" || v === "this-month" || v === "last-month" || v === "90d" || v === "ytd";

type Win = { from: Date | null; to: Date | null }; // to = exclusive

function windows(key: RangeKey, now: Date): { cur: Win; prev: Win | null } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const ms = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 1));
  switch (key) {
    case "this-month":
      return { cur: { from: ms(y, m), to: ms(y, m + 1) }, prev: { from: ms(y, m - 1), to: ms(y, m) } };
    case "last-month":
      return { cur: { from: ms(y, m - 1), to: ms(y, m) }, prev: { from: ms(y, m - 2), to: ms(y, m - 1) } };
    case "90d": {
      const to = new Date(Date.UTC(y, m, d + 1));
      const from = new Date(to.getTime() - 90 * DAY);
      return { cur: { from, to }, prev: { from: new Date(from.getTime() - 90 * DAY), to: from } };
    }
    case "ytd":
      return {
        cur: { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y, m, d + 1)) },
        prev: { from: new Date(Date.UTC(y - 1, 0, 1)), to: new Date(Date.UTC(y - 1, m, d + 1)) },
      };
    default:
      return { cur: { from: null, to: null }, prev: null };
  }
}

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const mk = (revenue: number, cost: number) => {
  const margin = r2(revenue - cost);
  return { revenue, cost, margin, marginPct: revenue > 0 ? r1((margin / revenue) * 100) : 0 };
};

class ProfitabilityReportService extends BaseService {
  // Revenue = posted buyer invoice-er taka. Cost = order-e bhag kora cost, oi order-er invoice-er taka onupate
  // (tai range dile cost-o shei onupate kome: matching principle)
  async report(key: RangeKey = "all") {
    const user = await this.guard("profitability.view");
    const scope = await listFilter(user);
    const now = new Date();
    const { cur, prev } = windows(key, now);

    const [lines, costs] = await Promise.all([
      prisma.buyerInvoiceLine.findMany({
        where: { invoice: { ...scope, status: { in: [...LIVE] } } },
        select: {
          orderId: true,
          amount: true,
          invoice: { select: { exchangeRate: true, invoiceDate: true } },
        },
      }),
      prisma.costAllocation.findMany({ where: scope, select: { orderId: true, amountBase: true } }),
    ]);

    const data = lines.map((l) => ({
      orderId: l.orderId,
      base: Number(l.amount) * Number(l.invoice.exchangeRate),
      at: l.invoice.invoiceDate.getTime(),
    }));
    const totalRev = new Map<string, number>();
    for (const l of data) totalRev.set(l.orderId, (totalRev.get(l.orderId) ?? 0) + l.base);
    const totalCost = new Map<string, number>();
    for (const c of costs) {
      if (c.orderId) totalCost.set(c.orderId, (totalCost.get(c.orderId) ?? 0) + Number(c.amountBase));
    }

    const slice = (w: Win) => {
      const rev = new Map<string, number>();
      for (const l of data) {
        if (w.from && l.at < w.from.getTime()) continue;
        if (w.to && l.at >= w.to.getTime()) continue;
        rev.set(l.orderId, (rev.get(l.orderId) ?? 0) + l.base);
      }
      const out = new Map<string, { revenue: number; cost: number }>();
      for (const [orderId, revenue] of rev) {
        const all = totalRev.get(orderId) ?? 0;
        out.set(orderId, { revenue, cost: all > 0 ? (totalCost.get(orderId) ?? 0) * (revenue / all) : 0 });
      }
      return out;
    };
    const sum = (m: Map<string, { revenue: number; cost: number }>) => {
      let revenue = 0;
      let cost = 0;
      for (const v of m.values()) {
        revenue += v.revenue;
        cost += v.cost;
      }
      return { revenue, cost };
    };

    const curMap = slice(cur);
    const t = sum(curMap);
    const totals = mk(r2(t.revenue), r2(t.cost));
    const prevTotals = prev
      ? (() => {
          const p = sum(slice(prev));
          return mk(r2(p.revenue), r2(p.cost));
        })()
      : null;

    const orderMeta = curMap.size
      ? await prisma.order.findMany({
          where: { id: { in: [...curMap.keys()] } },
          select: { id: true, orderNo: true, buyerId: true },
        })
      : [];
    const buyerMeta = orderMeta.length
      ? await prisma.buyer.findMany({
          where: { id: { in: [...new Set(orderMeta.map((o) => o.buyerId))] } },
          select: { id: true, name: true },
        })
      : [];
    const buyerName = (id: string) => buyerMeta.find((b) => b.id === id)?.name ?? "-";

    const orders = orderMeta
      .map((o) => {
        const v = curMap.get(o.id)!;
        return { orderId: o.id, orderNo: o.orderNo, buyerName: buyerName(o.buyerId), ...mk(r2(v.revenue), r2(v.cost)) };
      })
      .sort((a, b) => a.orderNo.localeCompare(b.orderNo));

    const byBuyer = new Map<string, { revenue: number; cost: number }>();
    for (const o of orderMeta) {
      const v = curMap.get(o.id)!;
      const c = byBuyer.get(o.buyerId) ?? { revenue: 0, cost: 0 };
      byBuyer.set(o.buyerId, { revenue: c.revenue + v.revenue, cost: c.cost + v.cost });
    }
    const buyers = [...byBuyer.entries()].map(([id, v]) => ({
      buyerId: id,
      name: buyerName(id),
      ...mk(r2(v.revenue), r2(v.cost)),
    }));

    // Profit trend: shesh 6 mash (range-er upor nirbhor kore na)
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const trend = Array.from({ length: 6 }, (_, i) => {
      const from = new Date(Date.UTC(y, m - 5 + i, 1));
      const to = new Date(Date.UTC(y, m - 4 + i, 1));
      const s = sum(slice({ from, to }));
      return {
        label: from.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
        value: r2(s.revenue - s.cost),
      };
    });

    const label =
      cur.from && cur.to ? `${fmtDay(cur.from)} – ${fmtDay(new Date(cur.to.getTime() - DAY))}` : "All time";

    return { rangeKey: key, label, totals, prev: prevTotals, buyers, orders, trend };
  }
}

export const profitabilityReportService = new ProfitabilityReportService();