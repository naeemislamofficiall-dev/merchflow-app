import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { nextTransferNo } from "@/lib/numbering-extra";
import { can, type SessionUser } from "@/lib/permissions";
import { EPS, TX_OPTIONS, loadWarehouse, lockMaterials, type Db } from "@/lib/stock";
import { BaseService } from "./base.service";

const createSchema = z.object({
  fromWarehouseId: z.string().min(1, "Select the source warehouse"),
  toWarehouseId: z.string().min(1, "Select the destination warehouse"),
  remarks: z.string().max(300).optional(),
});

const lineSchema = z.object({
  materialId: z.string().min(1),
  lotId: z.string().optional(),
  rollId: z.string().optional(),
  fromBinId: z.string().optional(),
  toBinId: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be more than 0").optional(),
});

function requireDraft(status: string, what: string) {
  if (status !== "DRAFT") throw new BusinessRuleError(`You cannot ${what} when the transfer is ${status.toLowerCase()}`);
}

class StockTransferService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const t = found(await prisma.stockTransfer.findUnique({ where: { id } }), "Transfer");
    await assertRecordInScope(user, t.companyId);
    await loadWarehouse(user, t.fromWarehouseId);
    await loadWarehouse(user, t.toWarehouseId);
    return t;
  }

  // নির্দিষ্ট লট, রোল ও bin-এ এখন কত আছে (null মানে "ওই ঘরে কিছু নেই", তাই হুবহু মেলানো হয়)
  private async balance(
    db: Db,
    w: { companyId: string; warehouseId: string; materialId: string; lotId: string | null; rollId: string | null; binId: string | null }
  ) {
    const r = await db.stockTransaction.aggregate({
      _sum: { quantity: true },
      where: {
        companyId: w.companyId,
        warehouseId: w.warehouseId,
        materialId: w.materialId,
        lotId: w.lotId,
        rollId: w.rollId,
        binId: w.binId,
      },
    });
    return Number(r._sum.quantity ?? 0);
  }

  async create(input: unknown) {
    const user = await this.guard("inventory.transfer");
    const d = createSchema.parse(input);
    if (d.fromWarehouseId === d.toWarehouseId) throw new BusinessRuleError("Source and destination must be different warehouses");
    await loadWarehouse(user, d.fromWarehouseId);
    await loadWarehouse(user, d.toWarehouseId);
    const row = await prisma.stockTransfer.create({
      data: {
        companyId: user.companyId,
        transferNo: await nextTransferNo(user.companyId),
        fromWarehouseId: d.fromWarehouseId,
        toWarehouseId: d.toWarehouseId,
        remarks: d.remarks,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "StockTransfer", entityId: row.id, after: row });
    return row;
  }

  async list() {
    const user = await this.guard("inventory.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.stockTransfer.findMany({
      where: {
        companyId: { in: scope.companyIds },
        fromWarehouse: { factoryId: { in: scope.factoryIds } },
      },
      include: {
        fromWarehouse: { select: { code: true, name: true } },
        toWarehouse: { select: { code: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      transferNo: r.transferNo,
      status: r.status,
      createdAt: r.createdAt,
      lineCount: r._count.lines,
      from: `${r.fromWarehouse.code} - ${r.fromWarehouse.name}`,
      to: `${r.toWarehouse.code} - ${r.toWarehouse.name}`,
    }));
  }

  async formOptions() {
    await this.guard("inventory.transfer");
    const wh = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
    return wh.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }));
  }

  async get(id: string) {
    const user = await this.guard("inventory.view");
    const t = await this.load(user, id);
    const [lines, from, to] = await Promise.all([
      prisma.stockTransferLine.findMany({
        where: { transferId: id },
        include: {
          material: { select: { code: true, name: true } },
          lot: { select: { lotNo: true } },
          roll: { select: { rollNo: true } },
        },
      }),
      prisma.warehouse.findUnique({ where: { id: t.fromWarehouseId }, select: { code: true, name: true } }),
      prisma.warehouse.findUnique({ where: { id: t.toWarehouseId }, select: { code: true, name: true } }),
    ]);
    const binIds = [
      ...new Set(lines.flatMap((l) => [l.fromBinId, l.toBinId]).filter((x): x is string => !!x)),
    ];
    const bins = await prisma.bin.findMany({ where: { id: { in: binIds } }, select: { id: true, code: true } });
    const binCode = new Map(bins.map((b) => [b.id, b.code]));

    const canEdit = can(user, "inventory.transfer") && t.status === "DRAFT";
    const [sources, toBins] = canEdit
      ? await Promise.all([
          this.sourceStock(t.companyId, t.fromWarehouseId),
          prisma.bin.findMany({
            where: { warehouseId: t.toWarehouseId, isActive: true },
            select: { id: true, code: true },
            orderBy: { code: "asc" },
          }),
        ])
      : [[], []];

    return {
      transfer: t,
      fromName: from ? `${from.code} - ${from.name}` : "-",
      toName: to ? `${to.code} - ${to.name}` : "-",
      lines: lines.map((l) => ({
        id: l.id,
        material: `${l.material.code} ${l.material.name}`,
        lotNo: l.lot?.lotNo ?? "",
        rollNo: l.roll?.rollNo ?? "",
        fromBin: l.fromBinId ? (binCode.get(l.fromBinId) ?? "") : "",
        toBin: l.toBinId ? (binCode.get(l.toBinId) ?? "") : "",
        quantity: Number(l.quantity),
        unit: l.unit,
      })),
      sources,
      toBins: toBins.map((b) => ({ value: b.id, label: b.code })),
      canEdit,
      canTransfer: can(user, "inventory.transfer"),
    };
  }

  // উৎস গুদামে যেখানে যেখানে স্টক আছে (মাল + লট + রোল + bin ধরে)
  private async sourceStock(companyId: string, warehouseId: string) {
    const groups = await prisma.stockTransaction.groupBy({
      by: ["materialId", "lotId", "rollId", "binId"],
      where: { companyId, warehouseId },
      _sum: { quantity: true },
    });
    const live = groups.filter((g) => Number(g._sum.quantity ?? 0) > EPS);
    const [materials, lots, rolls, bins] = await Promise.all([
      prisma.material.findMany({
        where: { id: { in: [...new Set(live.map((g) => g.materialId))] } },
        select: { id: true, code: true, name: true, unit: true },
      }),
      prisma.inventoryLot.findMany({
        where: { id: { in: live.map((g) => g.lotId).filter((x): x is string => !!x) } },
        select: { id: true, lotNo: true },
      }),
      prisma.fabricRoll.findMany({
        where: { id: { in: live.map((g) => g.rollId).filter((x): x is string => !!x) } },
        select: { id: true, rollNo: true },
      }),
      prisma.bin.findMany({
        where: { id: { in: live.map((g) => g.binId).filter((x): x is string => !!x) } },
        select: { id: true, code: true },
      }),
    ]);
    const mat = new Map(materials.map((m) => [m.id, m]));
    const lot = new Map(lots.map((l) => [l.id, l.lotNo]));
    const roll = new Map(rolls.map((r) => [r.id, r.rollNo]));
    const bin = new Map(bins.map((b) => [b.id, b.code]));
    return live
      .map((g) => {
        const m = mat.get(g.materialId);
        const qty = Number(g._sum.quantity ?? 0);
        const parts = [
          `${m?.code ?? "?"} ${m?.name ?? ""}`.trim(),
          g.lotId ? `lot ${lot.get(g.lotId) ?? "?"}` : "",
          g.rollId ? `roll ${roll.get(g.rollId) ?? "?"}` : "",
          g.binId ? `bin ${bin.get(g.binId) ?? "?"}` : "",
        ].filter(Boolean);
        return {
          materialId: g.materialId,
          lotId: g.lotId ?? "",
          rollId: g.rollId ?? "",
          fromBinId: g.binId ?? "",
          qty,
          isRoll: !!g.rollId,
          label: `${parts.join(" · ")} — ${qty} ${m?.unit ?? ""}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async addLine(id: string, input: unknown) {
    const user = await this.guard("inventory.transfer");
    const t = await this.load(user, id);
    requireDraft(t.status, "add lines");
    const d = lineSchema.parse(input);

    const material = found(await prisma.material.findUnique({ where: { id: d.materialId } }), "Material");
    if (material.companyId !== t.companyId) throw new BusinessRuleError("Material not found");

    let quantity = d.quantity ?? 0;
    const lotId = d.lotId || null;
    const rollId = d.rollId || null;
    const fromBinId = d.fromBinId || null;
    if (d.toBinId) {
      const b = await prisma.bin.findUnique({ where: { id: d.toBinId } });
      if (!b || b.warehouseId !== t.toWarehouseId) throw new BusinessRuleError("Destination bin does not belong to the destination warehouse");
    }
    const have = await this.balance(prisma, {
      companyId: t.companyId, warehouseId: t.fromWarehouseId, materialId: d.materialId,
      lotId, rollId, binId: fromBinId,
    });
    if (rollId) quantity = have; // রোল হলে পুরো রোলটাই যায়
    if (!(quantity > 0)) throw new BusinessRuleError("Quantity is required");
    if (quantity > have + EPS) throw new BusinessRuleError(`Only ${have} is available at the source`);

    const row = await prisma.stockTransferLine.create({
      data: {
        transferId: id,
        materialId: d.materialId,
        lotId,
        rollId,
        fromBinId,
        toBinId: d.toBinId || null,
        quantity,
        unit: material.unit,
      },
    });
    await this.audit({ user, action: "UPDATE", entity: "StockTransfer", entityId: id, after: { addedLine: row.id } });
    return row;
  }

  async removeLine(lineId: string) {
    const user = await this.guard("inventory.transfer");
    const line = found(await prisma.stockTransferLine.findUnique({ where: { id: lineId } }), "Line");
    const t = await this.load(user, line.transferId);
    requireDraft(t.status, "remove lines");
    await prisma.stockTransferLine.delete({ where: { id: lineId } });
    await this.audit({ user, action: "UPDATE", entity: "StockTransfer", entityId: t.id, after: { removedLine: lineId } });
    return { id: t.id };
  }

  // সব লাইন একসাথে একটাই transaction-এ: একটা ব্যর্থ হলে কোনোটাই হয় না
  async complete(id: string) {
    const user = await this.guard("inventory.transfer");
    const t = await this.load(user, id);
    requireDraft(t.status, "complete");

    const lines = await prisma.stockTransferLine.findMany({ where: { transferId: id } });
    if (lines.length === 0) throw new BusinessRuleError("Add at least one line");

    await prisma.$transaction(async (tx) => {
      const fresh = found(await tx.stockTransfer.findUnique({ where: { id } }), "Transfer");
      requireDraft(fresh.status, "complete");
      await lockMaterials(tx, t.companyId, lines.map((l) => l.materialId));

      for (const l of lines) {
        const have = await this.balance(tx, {
          companyId: t.companyId, warehouseId: t.fromWarehouseId, materialId: l.materialId,
          lotId: l.lotId, rollId: l.rollId, binId: l.fromBinId,
        });
        const qty = l.rollId ? have : Number(l.quantity);
        if (!(qty > 0) || qty > have + EPS) {
          throw new BusinessRuleError(`Not enough stock at the source for one of the lines (available ${have})`);
        }
        const base = {
          companyId: t.companyId,
          materialId: l.materialId,
          lotId: l.lotId,
          rollId: l.rollId,
          unit: l.unit,
          refType: "STOCK_TRANSFER",
          refId: t.id,
          remarks: t.remarks ?? `Transfer ${t.transferNo}`,
          createdById: user.id,
        };
        await tx.stockTransaction.create({
          data: { ...base, warehouseId: t.fromWarehouseId, binId: l.fromBinId, type: "TRANSFER_OUT", quantity: -qty },
        });
        await tx.stockTransaction.create({
          data: { ...base, warehouseId: t.toWarehouseId, binId: l.toBinId, type: "TRANSFER_IN", quantity: qty },
        });
        if (l.rollId) {
          await tx.fabricRoll.update({
            where: { id: l.rollId },
            data: { warehouseId: t.toWarehouseId, binId: l.toBinId },
          });
        }
      }
      await tx.stockTransfer.update({
        where: { id },
        data: { status: "COMPLETED", completedById: user.id, completedAt: new Date() },
      });
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "StockTransfer", entityId: id,
      before: { status: "DRAFT" }, after: { status: "COMPLETED", lines: lines.length },
    });
    return { id };
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("inventory.transfer");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const t = await this.load(user, id);
    requireDraft(t.status, "cancel");
    const row = await prisma.stockTransfer.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "StockTransfer", entityId: id,
      before: { status: t.status }, after: { status: row.status }, reason: reason.trim(),
    });
    return row;
  }
}

export const stockTransferService = new StockTransferService();
