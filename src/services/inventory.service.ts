import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertFactoryInScope } from "@/lib/scope";
import { nextAdjustmentNo } from "@/lib/numbering";
import {
  EPS,
  TX_OPTIONS,
  advisoryLock,
  incomingQty,
  loadWarehouse,
  lockMaterials,
  negativeStockAllowed,
  onHand,
  reservedQty,
  usableOnHand,
} from "@/lib/stock";
import { found } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const reserveSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  orderId: z.string().optional(),
  rollId: z.string().optional(),
  reason: z.string().max(300).optional(),
});

const transferSchema = z.object({
  materialId: z.string().min(1),
  lotId: z.string().optional(),
  rollId: z.string().optional(), // রোল সরালে পুরো রোলই যায়
  fromWarehouseId: z.string().min(1),
  fromBinId: z.string().optional(),
  toWarehouseId: z.string().min(1),
  toBinId: z.string().optional(),
  quantity: z.number().positive().optional(),
  remarks: z.string().max(300).optional(),
});

const adjustSchema = z.object({
  materialId: z.string().min(1),
  lotId: z.string().optional(),
  rollId: z.string().optional(),
  warehouseId: z.string().min(1),
  binId: z.string().optional(),
  quantityChange: z.number().refine((v) => v !== 0, "Quantity change cannot be 0"),
  reason: z.enum(["COUNT_CORRECTION", "DAMAGE", "SCRAP", "LOSS", "FOUND", "SUPPLIER_RETURN", "OTHER"]),
  remarks: z.string().min(3).max(500),
});

class InventoryService extends BaseService {
  private async material(user: SessionUser, id: string) {
    const m = found(await prisma.material.findUnique({ where: { id } }), "Material");
    if (m.companyId !== user.companyId) throw new BusinessRuleError("Material not found");
    return m;
  }

  // ---------- দেখা ----------

  // মাল ও গুদাম ধরে হাতে থাকা পরিমাণ
  async stock(filter: { materialId?: string; warehouseId?: string } = {}) {
    const user = await this.guard("inventory.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.stockTransaction.groupBy({
      by: ["materialId", "warehouseId"],
      where: {
        companyId: { in: scope.companyIds },
        warehouse: { factoryId: { in: scope.factoryIds } },
        ...(filter.materialId ? { materialId: filter.materialId } : {}),
        ...(filter.warehouseId ? { warehouseId: filter.warehouseId } : {}),
      },
      _sum: { quantity: true },
    });
    const mats = await prisma.material.findMany({
      where: { id: { in: rows.map((r) => r.materialId) } },
    });
    const byId = new Map(mats.map((m) => [m.id, m]));
    return rows.map((r) => ({
      materialId: r.materialId,
      materialCode: byId.get(r.materialId)?.code,
      materialName: byId.get(r.materialId)?.name,
      unit: byId.get(r.materialId)?.unit,
      warehouseId: r.warehouseId,
      onHand: Number(r._sum.quantity ?? 0),
    }));
  }

  // একটা মালের পুরো ছবি: হাতে, ব্যবহারযোগ্য, সংরক্ষিত, পাওয়ার যোগ্য, আসন্ন
  async summary(materialId: string) {
    const user = await this.guard("inventory.view");
    await this.material(user, materialId);
    const key = { companyId: user.companyId, materialId };
    const [total, usable, reserved, incoming] = await Promise.all([
      onHand(prisma, key),
      usableOnHand(prisma, key),
      reservedQty(prisma, key),
      incomingQty(prisma, user.companyId, materialId),
    ]);
    return { materialId, onHand: total, usable, reserved, available: usable - reserved, incoming };
  }

  async lots(materialId: string) {
    const user = await this.guard("inventory.view");
    await this.material(user, materialId);
    return prisma.inventoryLot.findMany({
      where: { companyId: user.companyId, materialId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Scan → রোলের পুরো ইতিহাস (সেকশন ২২)
  async scanRoll(rollNo: string) {
    const user = await this.guard("inventory.view");
    const roll = found(
      await prisma.fabricRoll.findUnique({
        where: { companyId_rollNo: { companyId: user.companyId, rollNo } },
        include: {
          material: true,
          lot: true,
          warehouse: true,
          bin: true,
          inspections: { orderBy: { inspectedAt: "desc" } },
          grnLine: { include: { grn: { select: { grnNo: true, challanNo: true, receivedDate: true } } } },
        },
      }),
      "Roll"
    );
    assertFactoryInScope(await this.scopeOf(user), roll.warehouse.factoryId);

    const history = await prisma.stockTransaction.findMany({
      where: { rollId: roll.id },
      orderBy: { createdAt: "asc" },
    });
    const current = history.reduce((s, t) => s + Number(t.quantity), 0);
    const issued = -history
      .filter((t) => t.type === "ISSUE" || t.type === "RETURN")
      .reduce((s, t) => s + Number(t.quantity), 0);
    const reserved = await reservedQty(prisma, {
      companyId: user.companyId,
      materialId: roll.materialId,
      rollId: roll.id,
    });
    return {
      roll,
      onHand: current,
      issued,
      reserved,
      available: roll.inspectionStatus === "REJECTED" ? 0 : Math.max(current - reserved, 0),
      history,
    };
  }

  // ---------- সংরক্ষণ (Reservation / Release) ----------

  async reserve(input: unknown) {
    const user = await this.guard("inventory.reserve");
    const d = reserveSchema.parse(input);
    await this.material(user, d.materialId);
    if (d.orderId) {
      const o = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
      if (o.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    }
    if (d.rollId) {
      const r = found(await prisma.fabricRoll.findUnique({ where: { id: d.rollId } }), "Roll");
      if (r.companyId !== user.companyId || r.materialId !== d.materialId) {
        throw new BusinessRuleError("Roll does not match this material");
      }
    }

    const row = await prisma.$transaction(async (tx) => {
      await lockMaterials(tx, user.companyId, [d.materialId]);
      const usable = await usableOnHand(tx, {
        companyId: user.companyId, materialId: d.materialId, rollId: d.rollId,
      });
      const reserved = await reservedQty(tx, {
        companyId: user.companyId, materialId: d.materialId, rollId: d.rollId,
      });
      const free = usable - reserved;
      if (d.quantity > free + EPS) {
        throw new BusinessRuleError(`Only ${Math.max(free, 0)} is available to reserve`);
      }
      return tx.stockReservation.create({
        data: { ...d, companyId: user.companyId, createdById: user.id },
      });
    }, TX_OPTIONS);
    await this.audit({ user, action: "CREATE", entity: "StockReservation", entityId: row.id, after: row });
    return row;
  }

  async release(reservationId: string) {
    const user = await this.guard("inventory.reserve");
    const r = found(await prisma.stockReservation.findUnique({ where: { id: reservationId } }), "Reservation");
    if (r.companyId !== user.companyId) throw new BusinessRuleError("Reservation not found");
    if (r.status !== "ACTIVE") throw new BusinessRuleError("This reservation is not active");
    const row = await prisma.stockReservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
    await this.audit({
      user, action: "UPDATE", entity: "StockReservation", entityId: reservationId,
      before: { status: r.status }, after: { status: row.status },
    });
    return row;
  }

  async listReservations(filter: { materialId?: string; orderId?: string } = {}) {
    const user = await this.guard("inventory.view");
    return prisma.stockReservation.findMany({
      where: {
        companyId: user.companyId,
        status: "ACTIVE",
        ...(filter.materialId ? { materialId: filter.materialId } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      include: { material: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------- ট্রান্সফার ----------

  // এক গুদাম বা bin থেকে অন্যটায়। দুটো খাতার এন্ট্রি একসাথে হয়।
  async transfer(input: unknown) {
    const user = await this.guard("inventory.transfer");
    const d = transferSchema.parse(input);
    await loadWarehouse(user, d.fromWarehouseId, d.fromBinId);
    await loadWarehouse(user, d.toWarehouseId, d.toBinId);
    if (d.fromWarehouseId === d.toWarehouseId && (d.fromBinId ?? null) === (d.toBinId ?? null)) {
      throw new BusinessRuleError("Source and destination are the same");
    }
    const mat = await this.material(user, d.materialId);
    const refId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await lockMaterials(tx, user.companyId, [d.materialId]);
      const roll = d.rollId
        ? found(await tx.fabricRoll.findUnique({ where: { id: d.rollId } }), "Roll")
        : null;
      let qty = d.quantity ?? 0;
      let lotId = d.lotId;

      if (roll) {
        if (
          roll.companyId !== user.companyId ||
          roll.materialId !== d.materialId ||
          roll.warehouseId !== d.fromWarehouseId
        ) {
          throw new BusinessRuleError("Roll is not in the source warehouse");
        }
        lotId = roll.lotId;
        qty = await onHand(tx, {
          companyId: user.companyId, materialId: d.materialId,
          rollId: roll.id, warehouseId: d.fromWarehouseId,
        });
      }
      if (qty <= 0) throw new BusinessRuleError("Quantity is required");

      const have = await onHand(tx, {
        companyId: user.companyId,
        materialId: d.materialId,
        warehouseId: d.fromWarehouseId,
        lotId,
        rollId: d.rollId,
        binId: roll ? undefined : d.fromBinId,
      });
      if (qty > have + EPS) throw new BusinessRuleError(`Only ${have} is available in the source location`);

      const base = {
        companyId: user.companyId,
        materialId: d.materialId,
        lotId,
        rollId: d.rollId,
        unit: mat.unit,
        refType: "TRANSFER",
        refId,
        remarks: d.remarks,
        createdById: user.id,
      };
      await tx.stockTransaction.create({
        data: {
          ...base, warehouseId: d.fromWarehouseId, binId: roll ? roll.binId : d.fromBinId,
          type: "TRANSFER_OUT", quantity: -qty,
        },
      });
      await tx.stockTransaction.create({
        data: { ...base, warehouseId: d.toWarehouseId, binId: d.toBinId, type: "TRANSFER_IN", quantity: qty },
      });
      if (roll) {
        await tx.fabricRoll.update({
          where: { id: roll.id },
          data: { warehouseId: d.toWarehouseId, binId: d.toBinId ?? null },
        });
      }
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "StockTransfer", entityId: refId, after: d });
    return { refId };
  }

  // ---------- অ্যাডজাস্টমেন্ট (নিয়ম ১৪: কারণ আর permission ছাড়া নয়) ----------

  async adjust(input: unknown) {
    const user = await this.guard("inventory.adjust");
    const d = adjustSchema.parse(input);
    await loadWarehouse(user, d.warehouseId, d.binId);
    const mat = await this.material(user, d.materialId);

    // কমানোর কারণে বাড়ানো, বা উল্টোটা, ভুল ধরা হবে
    const mustReduce = ["DAMAGE", "SCRAP", "LOSS", "SUPPLIER_RETURN"].includes(d.reason);
    if (mustReduce && d.quantityChange > 0) throw new BusinessRuleError("This reason needs a negative quantity");
    if (d.reason === "FOUND" && d.quantityChange < 0) throw new BusinessRuleError("This reason needs a positive quantity");

    const typeByReason = {
      COUNT_CORRECTION: "STOCK_COUNT", DAMAGE: "DAMAGE", SCRAP: "SCRAP",
      LOSS: "ADJUSTMENT", FOUND: "ADJUSTMENT", SUPPLIER_RETURN: "ADJUSTMENT", OTHER: "ADJUSTMENT",
    } as const;

    const row = await prisma.$transaction(async (tx) => {
      await lockMaterials(tx, user.companyId, [d.materialId]);
      await advisoryLock(tx, `seq:adj:${user.companyId}`);

      let lotId = d.lotId;
      if (d.rollId) {
        const roll = found(await tx.fabricRoll.findUnique({ where: { id: d.rollId } }), "Roll");
        if (roll.companyId !== user.companyId || roll.materialId !== d.materialId || roll.warehouseId !== d.warehouseId) {
          throw new BusinessRuleError("Roll is not in this warehouse");
        }
        lotId = roll.lotId;
      }
      const current = await onHand(tx, {
        companyId: user.companyId, materialId: d.materialId, warehouseId: d.warehouseId,
        lotId, rollId: d.rollId, binId: d.binId,
      });
      if (!(await negativeStockAllowed(tx, user.companyId)) && current + d.quantityChange < -EPS) {
        throw new BusinessRuleError(`Stock would go below zero (current: ${current})`);
      }

      const adj = await tx.stockAdjustment.create({
        data: {
          companyId: user.companyId,
          adjustmentNo: await nextAdjustmentNo(user.companyId),
          materialId: d.materialId,
          lotId,
          rollId: d.rollId,
          warehouseId: d.warehouseId,
          binId: d.binId,
          quantityChange: d.quantityChange,
          reason: d.reason,
          remarks: d.remarks,
          adjustedById: user.id,
        },
      });
      await tx.stockTransaction.create({
        data: {
          companyId: user.companyId,
          materialId: d.materialId,
          lotId,
          rollId: d.rollId,
          warehouseId: d.warehouseId,
          binId: d.binId,
          type: typeByReason[d.reason],
          quantity: d.quantityChange,
          unit: mat.unit,
          refType: "StockAdjustment",
          refId: adj.id,
          remarks: d.remarks,
          createdById: user.id,
        },
      });
      return adj;
    }, TX_OPTIONS);

    await this.audit({
      user, action: "CREATE", entity: "StockAdjustment", entityId: row.id, after: row, reason: d.remarks,
    });
    return row;
  }

  // ---------- Reorder point (সেকশন ১৭: PR-এর একটা উৎস) ----------

  // যে মালের (ব্যবহারযোগ্য − সংরক্ষিত + আসন্ন) reorder point-এর নিচে
  async reorderSuggestions() {
    const user = await this.guard("inventory.view");
    const mats = await prisma.material.findMany({
      where: { companyId: user.companyId, status: "ACTIVE", reorderPoint: { not: null } },
    });
    const out = [];
    for (const m of mats) {
      const key = { companyId: user.companyId, materialId: m.id };
      const [usable, reserved, incoming] = await Promise.all([
        usableOnHand(prisma, key),
        reservedQty(prisma, key),
        incomingQty(prisma, user.companyId, m.id),
      ]);
      const position = usable - reserved + incoming;
      const point = Number(m.reorderPoint);
      if (position < point) {
        out.push({
          materialId: m.id, code: m.code, name: m.name, unit: m.unit,
          position, reorderPoint: point, shortBy: point - position,
        });
      }
    }
    return out;
  }
}

export const inventoryService = new InventoryService();