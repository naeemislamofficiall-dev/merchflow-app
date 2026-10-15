import { prisma } from "@/lib/prisma";
import { wipBalances } from "@/lib/production-calc";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

type Totals = {
  cut: number; sewn: number; sewingReject: number; sewingRework: number; finished: number;
  packed: number; shipped: number;
};

class WipService extends BaseService {
  // কয়েকটা production order-এর Cut / Sewing / Finishing / Packed / Shipped একসাথে (N+1 ছাড়া)
  private async totals(ids: string[]) {
    const where = { productionOrderId: { in: ids } };
    const [bundles, sewing, finishing, packedRows, shippedRows] = await Promise.all([
      prisma.bundle.groupBy({ by: ["productionOrderId"], _sum: { quantity: true }, where }),
      prisma.sewingLog.groupBy({
        by: ["productionOrderId"],
        _sum: { output: true, reject: true, rework: true },
        where,
      }),
      prisma.finishingLog.groupBy({ by: ["productionOrderId"], _sum: { outputQty: true }, where }),
      // Packed = বন্ধ করা বা শিপ হওয়া carton-এর মাল (খোলা carton ধরা হয় না), Shipped = SHIPPED carton
      prisma.cartonLine.groupBy({
        by: ["productionOrderId"], _sum: { quantity: true },
        where: { ...where, carton: { status: { in: ["CLOSED", "SHIPPED"] } } },
      }),
      prisma.cartonLine.groupBy({
        by: ["productionOrderId"], _sum: { quantity: true },
        where: { ...where, carton: { status: "SHIPPED" } },
      }),
    ]);
    const map = new Map<string, Totals>();
    for (const id of ids) map.set(id, { cut: 0, sewn: 0, sewingReject: 0, sewingRework: 0, finished: 0, packed: 0, shipped: 0 });
    for (const b of bundles) map.get(b.productionOrderId)!.cut = b._sum.quantity ?? 0;
    for (const s of sewing) {
      const t = map.get(s.productionOrderId)!;
      t.sewn = s._sum.output ?? 0;
      t.sewingReject = s._sum.reject ?? 0;
      t.sewingRework = s._sum.rework ?? 0;
    }
    for (const f of finishing) map.get(f.productionOrderId)!.finished = f._sum.outputQty ?? 0;
    for (const p of packedRows) map.get(p.productionOrderId)!.packed = p._sum.quantity ?? 0;
    for (const p of shippedRows) map.get(p.productionOrderId)!.shipped = p._sum.quantity ?? 0;
    return map;
  }

  private row(po: { id: string; productionNo: string; quantity: number; status: string }, t: Totals) {
    const { packed, shipped } = t;
    return {
      productionOrderId: po.id,
      productionNo: po.productionNo,
      status: po.status,
      planned: po.quantity,
      cut: t.cut,
      sewn: t.sewn,
      sewingReject: t.sewingReject,
      sewingRework: t.sewingRework,
      finished: t.finished,
      packed,
      shipped,
      balances: wipBalances({ orderQty: po.quantity, cut: t.cut, sewn: t.sewn, finished: t.finished, packed, shipped }),
    };
  }

  // স্পেকের "Order 1024: Cut / Sewing / Finishing / Packed / Shipped" দেখা
  async forOrder(orderId: string) {
    const user = await this.guard("wip.view");
    const order = found(await prisma.order.findUnique({ where: { id: orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);
    const scope = await this.scopeOf(user);

    const pos = await prisma.productionOrder.findMany({
      where: { orderId, status: { not: "CANCELLED" }, ...factoryWhere(scope) },
      include: { style: { select: { styleNo: true, name: true } } },
      orderBy: { productionNo: "asc" },
    });
    const totals = await this.totals(pos.map((p) => p.id));
    const rows = pos.map((p) => ({ ...this.row(p, totals.get(p.id)!), style: p.style }));

    const orderQty = (await prisma.orderLine.aggregate({ _sum: { quantity: true }, where: { orderId } }))._sum.quantity ?? 0;
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
    const cut = sum((r) => r.cut);
    const sewn = sum((r) => r.sewn);
    const finished = sum((r) => r.finished);
    const packed = sum((r) => r.packed);
    const shipped = sum((r) => r.shipped);

    return {
      orderId,
      orderNo: order.orderNo,
      orderQty,
      cut,
      sewn,
      finished,
      packed,
      shipped,
      balances: wipBalances({ orderQty, cut, sewn, finished, packed, shipped }),
      productionOrders: rows,
    };
  }

  // একটা production order-এর WIP
  async forProductionOrder(id: string) {
    const user = await this.guard("wip.view");
    const po = found(await prisma.productionOrder.findUnique({ where: { id } }), "Production order");
    await assertRecordInScope(user, po.companyId);
    assertFactoryInScope(await this.scopeOf(user), po.factoryId);
    const totals = await this.totals([id]);
    return this.row(po, totals.get(id)!);
  }

  // চলমান সব production order-এর WIP (WIP dashboard)
  async open() {
    const user = await this.guard("wip.view");
    const scope = await this.scopeOf(user);
    const pos = await prisma.productionOrder.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(scope),
        status: { in: ["RELEASED", "IN_PROGRESS", "PAUSED"] },
      },
      include: {
        style: { select: { styleNo: true } },
        order: { select: { orderNo: true } },
      },
      orderBy: [{ priority: "asc" }, { startDate: "asc" }],
    });
    const totals = await this.totals(pos.map((p) => p.id));
    return pos.map((p) => ({
      ...this.row(p, totals.get(p.id)!),
      orderNo: p.order.orderNo,
      styleNo: p.style.styleNo,
    }));
  }
}

export const wipService = new WipService();