import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { nextAdjustmentNo } from "@/lib/numbering";
import { nextStockCountNo, numberSeries } from "@/lib/numbering-extra";
import { can, type SessionUser } from "@/lib/permissions";
import { EPS, TX_OPTIONS, advisoryLock, loadWarehouse, lockMaterials } from "@/lib/stock";
import { BaseService } from "./base.service";

const createSchema = z.object({
  warehouseId: z.string().min(1, "Select a warehouse"),
  remarks: z.string().max(300).optional(),
});

const countsSchema = z.array(
  z.object({
    lineId: z.string().min(1),
    countedQty: z.number().min(0, "Counted quantity cannot be negative").nullable(),
  })
);

function requireStatus(current: string, allowed: string[], what: string) {
  if (!allowed.includes(current)) {
    throw new BusinessRuleError(`You cannot ${what} when the count is ${current.toLowerCase()}`);
  }
}

class StockCountService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const count = found(await prisma.stockCount.findUnique({ where: { id } }), "Stock count");
    await assertRecordInScope(user, count.companyId);
    await loadWarehouse(user, count.warehouseId); // গুদামের factory scope-ও দেখে নেয়
    return count;
  }

  async create(input: unknown) {
    const user = await this.guard("stockcount.create");
    const d = createSchema.parse(input);
    await loadWarehouse(user, d.warehouseId);
    const row = await prisma.stockCount.create({
      data: {
        companyId: user.companyId,
        countNo: await nextStockCountNo(user.companyId),
        warehouseId: d.warehouseId,
        remarks: d.remarks,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "StockCount", entityId: row.id, after: row });
    return row;
  }

  async list() {
    const user = await this.guard("stockcount.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.stockCount.findMany({
      where: {
        companyId: { in: scope.companyIds },
        warehouse: { factoryId: { in: scope.factoryIds } },
      },
      include: {
        warehouse: { select: { code: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      countNo: r.countNo,
      status: r.status,
      createdAt: r.createdAt,
      lineCount: r._count.lines,
      warehouseName: `${r.warehouse.code} - ${r.warehouse.name}`,
    }));
  }

  async get(id: string) {
    const user = await this.guard("stockcount.view");
    const count = await this.load(user, id);
    const [lines, warehouse] = await Promise.all([
      prisma.stockCountLine.findMany({
        where: { countId: id },
        include: {
          material: { select: { code: true, name: true } },
          lot: { select: { lotNo: true } },
          roll: { select: { rollNo: true } },
        },
      }),
      prisma.warehouse.findUnique({ where: { id: count.warehouseId }, select: { code: true, name: true } }),
    ]);
    const binIds = [...new Set(lines.map((l) => l.binId).filter((x): x is string => !!x))];
    const bins = await prisma.bin.findMany({ where: { id: { in: binIds } }, select: { id: true, code: true } });
    const binCode = new Map(bins.map((b) => [b.id, b.code]));

    const rows = lines
      .map((l) => ({
        id: l.id,
        materialCode: l.material.code,
        materialName: l.material.name,
        lotNo: l.lot?.lotNo ?? "",
        rollNo: l.roll?.rollNo ?? "",
        binCode: l.binId ? (binCode.get(l.binId) ?? "") : "",
        unit: l.unit,
        systemQty: Number(l.systemQty),
        countedQty: l.countedQty === null ? null : Number(l.countedQty),
      }))
      .sort(
        (a, b) =>
          a.materialCode.localeCompare(b.materialCode) ||
          a.lotNo.localeCompare(b.lotNo) ||
          a.rollNo.localeCompare(b.rollNo)
      );
    return {
      count,
      warehouseName: warehouse ? `${warehouse.code} - ${warehouse.name}` : "-",
      lines: rows,
      canPost: can(user, "stockcount.post") && can(user, "inventory.adjust"),
      canCount: can(user, "stockcount.count"),
      canCreate: can(user, "stockcount.create"),
      canCancel: can(user, "stockcount.cancel"),
    };
  }

  // এখনকার খাতার স্টক থেকে গণনার তালিকা বানায় (লট, রোল ও bin ধরে)। আগের গোনা সংখ্যা মুছে যায়
  async generateLines(id: string) {
    const user = await this.guard("stockcount.create");
    const count = await this.load(user, id);
    requireStatus(count.status, ["DRAFT"], "generate lines");

    const groups = await prisma.stockTransaction.groupBy({
      by: ["materialId", "lotId", "rollId", "binId"],
      where: { companyId: count.companyId, warehouseId: count.warehouseId },
      _sum: { quantity: true },
    });
    const live = groups.filter((g) => Math.abs(Number(g._sum.quantity ?? 0)) > EPS);
    if (live.length === 0) throw new BusinessRuleError("This warehouse has no stock to count");

    const materials = await prisma.material.findMany({
      where: { id: { in: [...new Set(live.map((g) => g.materialId))] } },
      select: { id: true, unit: true },
    });
    const unit = new Map(materials.map((m) => [m.id, m.unit]));

    await prisma.$transaction(async (tx) => {
      await tx.stockCountLine.deleteMany({ where: { countId: id } });
      await tx.stockCountLine.createMany({
        data: live.map((g) => ({
          countId: id,
          materialId: g.materialId,
          lotId: g.lotId,
          rollId: g.rollId,
          binId: g.binId,
          unit: unit.get(g.materialId) ?? "PCS",
          systemQty: Number(g._sum.quantity ?? 0),
        })),
      });
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "StockCount", entityId: id,
      after: { generatedLines: live.length },
    });
    return { lines: live.length };
  }

  async saveCounts(id: string, input: unknown) {
    const user = await this.guard("stockcount.count");
    const count = await this.load(user, id);
    requireStatus(count.status, ["DRAFT"], "enter counts");
    const rows = countsSchema.parse(input);

    const own = await prisma.stockCountLine.findMany({ where: { countId: id }, select: { id: true } });
    const ownIds = new Set(own.map((l) => l.id));
    if (rows.some((r) => !ownIds.has(r.lineId))) throw new BusinessRuleError("A line does not belong to this count");

    await prisma.$transaction(
      rows.map((r) =>
        prisma.stockCountLine.update({ where: { id: r.lineId }, data: { countedQty: r.countedQty } })
      )
    );
    await this.audit({
      user, action: "UPDATE", entity: "StockCount", entityId: id,
      after: { countedLines: rows.filter((r) => r.countedQty !== null).length },
    });
    return { saved: rows.length };
  }

  // গণনার সাথে খাতা মিলিয়ে ফারাকটা audited adjustment হিসেবে বসায়
  async post(id: string) {
    const user = await this.guard("stockcount.post");
    if (!can(user, "inventory.adjust")) {
      throw new BusinessRuleError("Posting a count changes stock, so you also need the stock adjustment permission");
    }
    const count = await this.load(user, id);
    requireStatus(count.status, ["DRAFT"], "post");

    const lines = await prisma.stockCountLine.findMany({ where: { countId: id } });
    if (lines.length === 0) throw new BusinessRuleError("Generate the count lines first");
    const missing = lines.filter((l) => l.countedQty === null).length;
    if (missing > 0) throw new BusinessRuleError(`${missing} line(s) are not counted yet`);

    const result = await prisma.$transaction(async (tx) => {
      // আবার status দেখি: অন্য কেউ এর মধ্যে post করে ফেললে দ্বিতীয়বার যেন না বসে
      const fresh = found(await tx.stockCount.findUnique({ where: { id } }), "Stock count");
      requireStatus(fresh.status, ["DRAFT"], "post");

      await lockMaterials(tx, count.companyId, lines.map((l) => l.materialId));
      await advisoryLock(tx, `seq:adj:${count.companyId}`);
      const nextNo = numberSeries(await nextAdjustmentNo(count.companyId));

      let adjusted = 0;
      for (const line of lines) {
        const sum = await tx.stockTransaction.aggregate({
          _sum: { quantity: true },
          where: {
            companyId: count.companyId,
            materialId: line.materialId,
            warehouseId: count.warehouseId,
            lotId: line.lotId, // null হলে "লট ছাড়া" লেনদেনই ধরা হয়
            rollId: line.rollId,
            binId: line.binId,
          },
        });
        const current = Number(sum._sum.quantity ?? 0);
        const delta = Math.round((Number(line.countedQty) - current) * 10000) / 10000;
        if (Math.abs(delta) <= EPS) continue;

        const adj = await tx.stockAdjustment.create({
          data: {
            companyId: count.companyId,
            adjustmentNo: nextNo(),
            materialId: line.materialId,
            lotId: line.lotId,
            rollId: line.rollId,
            warehouseId: count.warehouseId,
            binId: line.binId,
            quantityChange: delta,
            reason: "COUNT_CORRECTION",
            remarks: `Stock count ${count.countNo}`,
            adjustedById: user.id,
          },
        });
        await tx.stockTransaction.create({
          data: {
            companyId: count.companyId,
            materialId: line.materialId,
            lotId: line.lotId,
            rollId: line.rollId,
            warehouseId: count.warehouseId,
            binId: line.binId,
            type: "STOCK_COUNT",
            quantity: delta,
            unit: line.unit,
            refType: "StockAdjustment",
            refId: adj.id,
            remarks: `Stock count ${count.countNo}`,
            createdById: user.id,
          },
        });
        adjusted += 1;
      }
      await tx.stockCount.update({
        where: { id },
        data: { status: "POSTED", postedAt: new Date(), postedById: user.id },
      });
      return { adjusted };
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "StockCount", entityId: id,
      before: { status: count.status }, after: { status: "POSTED", adjustedLines: result.adjusted },
    });
    return result;
  }

  // বাতিলের কারণ audit log-এ থাকে (আপনার StockCount মডেলে আলাদা কলাম নেই)
  async cancel(id: string, reason: string) {
    const user = await this.guard("stockcount.cancel");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const count = await this.load(user, id);
    requireStatus(count.status, ["DRAFT"], "cancel");
    const row = await prisma.stockCount.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "StockCount", entityId: id,
      before: { status: count.status }, after: { status: row.status }, reason: reason.trim(),
    });
    return row;
  }
}

export const stockCountService = new StockCountService();
