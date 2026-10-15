import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { can } from "@/lib/permissions";
import { nextGrnNo } from "@/lib/numbering";
import { assertTransition, poTransitions } from "@/lib/status-rules";
import { EPS, TX_OPTIONS, advisoryLock, loadWarehouse, lockMaterials } from "@/lib/stock";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

// যেসব PO-তে মাল গ্রহণ করা যায় (Sent হলেও প্রথম মাল আসাকে স্বীকৃতি ধরা হয়)
const RECEIVABLE = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"];

// ফেব্রিকের একটা রোল (ফেব্রিক হলে এই তালিকা দিতে হয়, Post করলে FabricRoll তৈরি হয়)
const rollSchema = z.object({
  rollNo: z.string().min(1).max(60).optional(), // না দিলে নিজে বানাবে
  quantity: z.number().positive(),
  color: z.string().max(60).optional(),
  shade: z.string().max(60).optional(),
  gsm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  length: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
});

const lineSchema = z.object({
  poLineId: z.string().min(1),
  receivedQty: z.number().positive(),
  lotNo: z.string().min(1).max(60).optional(),
  color: z.string().max(60).optional(),
  shade: z.string().max(60).optional(),
  binId: z.string().optional(),
  remarks: z.string().max(300).optional(),
  overReason: z.string().max(300).optional(), // অর্ডারের বেশি নিলে কারণ
  rolls: z.array(rollSchema).optional(),
});

const createSchema = z.object({
  poId: z.string().min(1),
  warehouseId: z.string().min(1),
  receivedDate: z.coerce.date().optional(),
  challanNo: z.string().max(60).optional(),
  remarks: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
});

// রোলগুলোর যোগফল লাইনের পরিমাণের সাথে মিলতে হবে
function assertRollsMatch(code: string, qty: number, rolls: { quantity: number }[]) {
  if (rolls.length === 0) return;
  const sum = rolls.reduce((s, r) => s + r.quantity, 0);
  if (Math.abs(sum - qty) > EPS) {
    throw new BusinessRuleError(`${code}: roll quantities add up to ${sum}, but received quantity is ${qty}`);
  }
}

class GrnService extends BaseService {
  async list(filter: { poId?: string; status?: "DRAFT" | "POSTED" | "CANCELLED" } = {}) {
    const user = await this.guard("grn.view");
    return prisma.grn.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.poId ? { poId: filter.poId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { po: { select: { poNo: true } }, warehouse: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("grn.view");
    const grn = found(await prisma.grn.findUnique({ where: { id } }), "GRN");
    await assertRecordInScope(user, grn.companyId);
    return prisma.grn.findUnique({
      where: { id },
      include: {
        po: { include: { supplier: true } },
        warehouse: true,
        lines: { include: { material: true, rolls: true } },
      },
    });
  }

  // খসড়া GRN: এখনো স্টকে কিছু বদলায় না। Post করলে স্টকে ঢোকে।
  async create(input: unknown) {
    const user = await this.guard("grn.create");
    const d = createSchema.parse(input);
    await loadWarehouse(user, d.warehouseId);
    for (const l of d.lines) {
      if (l.binId) await loadWarehouse(user, d.warehouseId, l.binId);
    }

    const po = found(
      await prisma.purchaseOrder.findUnique({
        where: { id: d.poId },
        include: { lines: { include: { material: true } } },
      }),
      "PO"
    );
    if (po.companyId !== user.companyId) throw new BusinessRuleError("PO not found");
    if (!RECEIVABLE.includes(po.status)) {
      throw new BusinessRuleError("Goods can be received only against a PO that has been sent to the supplier");
    }

    const seen = new Set<string>();
    for (const l of d.lines) {
      if (seen.has(l.poLineId)) throw new BusinessRuleError("A PO line can appear only once in a GRN");
      seen.add(l.poLineId);
      const pl = po.lines.find((x) => x.id === l.poLineId);
      if (!pl) throw new BusinessRuleError("A line does not belong to this PO");
      assertRollsMatch(pl.material.code, l.receivedQty, l.rolls ?? []);
      if ((l.rolls ?? []).length > 0 && !l.lotNo) {
        throw new BusinessRuleError(`${pl.material.code}: lot number is required for fabric rolls`);
      }
    }

    const row = await prisma.$transaction(async (tx) => {
      await advisoryLock(tx, `seq:grn:${user.companyId}`);
      return tx.grn.create({
        data: {
          companyId: user.companyId,
          grnNo: await nextGrnNo(user.companyId),
          poId: po.id,
          warehouseId: d.warehouseId,
          receivedDate: d.receivedDate,
          challanNo: d.challanNo,
          remarks: d.remarks,
          createdById: user.id,
          lines: {
            create: d.lines.map((l) => {
              const pl = po.lines.find((x) => x.id === l.poLineId)!;
              return {
                poLineId: l.poLineId,
                materialId: pl.materialId,
                receivedQty: l.receivedQty,
                unit: pl.material.unit,
                lotNo: l.lotNo,
                color: l.color,
                shade: l.shade,
                binId: l.binId,
                remarks: l.remarks,
                overReason: l.overReason,
                rollData: l.rolls && l.rolls.length > 0 ? JSON.parse(JSON.stringify(l.rolls)) : undefined,
              };
            }),
          },
        },
        include: { lines: true },
      });
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "Grn", entityId: row.id, after: row });
    return row;
  }

  // Post: স্টকের খাতায় ঢোকে, PO-র গৃহীত পরিমাণ বাড়ে, PO-র অবস্থা বদলায়।
  // নিয়ম ৩: অর্ডারের বেশি নিতে grn.over_receive permission ও কারণ লাগে।
  async post(id: string) {
    const user = await this.guard("grn.post");
    const grn = found(await prisma.grn.findUnique({ where: { id } }), "GRN");
    await assertRecordInScope(user, grn.companyId);
    if (grn.status !== "DRAFT") throw new BusinessRuleError("Only a draft GRN can be posted");
    await loadWarehouse(user, grn.warehouseId);
    const mayOverReceive = can(user, "grn.over_receive");

    const overNotes: string[] = [];

    const posted = await prisma.$transaction(async (tx) => {
      // একই GRN দুবার Post ঠেকাতে
      await advisoryLock(tx, `grn:post:${id}`);
      const fresh = found(await tx.grn.findUnique({ where: { id }, include: { lines: true } }), "GRN");
      if (fresh.status !== "DRAFT") throw new BusinessRuleError("This GRN is already posted or cancelled");

      const po = found(
        await tx.purchaseOrder.findUnique({ where: { id: fresh.poId }, include: { lines: true } }),
        "PO"
      );
      if (!RECEIVABLE.includes(po.status)) {
        throw new BusinessRuleError("This PO can no longer receive goods");
      }

      const matIds = fresh.lines.map((l) => l.materialId);
      await lockMaterials(tx, user.companyId, matIds);
      const mats = await tx.material.findMany({ where: { id: { in: matIds } } });
      const matById = new Map(mats.map((m) => [m.id, m]));

      for (const l of fresh.lines) {
        const mat = matById.get(l.materialId)!;
        const pl = found(po.lines.find((x) => x.id === l.poLineId), "PO line");
        const qty = Number(l.receivedQty);

        // নিয়ম ৩: অর্ডারের বেশি গ্রহণ
        const total = Number(pl.receivedQty) + qty;
        if (total > Number(pl.quantity) + EPS) {
          if (!mayOverReceive) {
            throw new BusinessRuleError(
              `${mat.code}: ordered ${Number(pl.quantity)}, already received ${Number(pl.receivedQty)}, this GRN ${qty}. Over-receipt needs authorization`
            );
          }
          if (!l.overReason || l.overReason.trim().length < 3) {
            throw new BusinessRuleError(`${mat.code}: a reason is required for over-receipt`);
          }
          overNotes.push(`${mat.code}: ${l.overReason}`);
        }

        const rolls = z.array(rollSchema).parse(l.rollData ?? []);
        assertRollsMatch(mat.code, qty, rolls);

        // লট (Item → Color → Lot)
        let lotId: string | undefined;
        if (l.lotNo) {
          const lot = await tx.inventoryLot.upsert({
            where: {
              companyId_materialId_lotNo: {
                companyId: user.companyId,
                materialId: l.materialId,
                lotNo: l.lotNo,
              },
            },
            update: {},
            create: {
              companyId: user.companyId,
              materialId: l.materialId,
              lotNo: l.lotNo,
              color: l.color ?? undefined,
              shade: l.shade ?? undefined,
              supplierId: po.supplierId,
            },
          });
          lotId = lot.id;
          await tx.grnLine.update({ where: { id: l.id }, data: { lotId } });
        }

        const base = {
          companyId: user.companyId,
          materialId: l.materialId,
          warehouseId: fresh.warehouseId,
          binId: l.binId ?? undefined,
          type: "GRN" as const,
          unit: mat.unit,
          orderId: pl.orderId ?? undefined,
          refType: "Grn",
          refId: fresh.id,
          createdById: user.id,
        };

        if (rolls.length > 0) {
          if (!lotId) throw new BusinessRuleError(`${mat.code}: lot number is required for fabric rolls`);
          const already = await tx.fabricRoll.count({
            where: { companyId: user.companyId, materialId: l.materialId, lotId },
          });
          for (let i = 0; i < rolls.length; i++) {
            const r = rolls[i];
            const rollNo = r.rollNo ?? `${mat.code}-${l.lotNo}-R${String(already + i + 1).padStart(4, "0")}`;
            const dup = await tx.fabricRoll.findUnique({
              where: { companyId_rollNo: { companyId: user.companyId, rollNo } },
            });
            if (dup) throw new BusinessRuleError(`Roll number ${rollNo} already exists`);
            const roll = await tx.fabricRoll.create({
              data: {
                companyId: user.companyId,
                rollNo,
                materialId: l.materialId,
                lotId,
                grnLineId: l.id,
                color: r.color ?? l.color ?? undefined,
                shade: r.shade ?? l.shade ?? undefined,
                gsm: r.gsm,
                widthCm: r.widthCm,
                length: r.length,
                weightKg: r.weightKg,
                quantity: r.quantity,
                supplierId: po.supplierId,
                warehouseId: fresh.warehouseId,
                binId: l.binId ?? undefined,
              },
            });
            await tx.stockTransaction.create({
              data: { ...base, lotId, rollId: roll.id, quantity: r.quantity },
            });
          }
        } else {
          await tx.stockTransaction.create({ data: { ...base, lotId, quantity: qty } });
        }

        await tx.purchaseOrderLine.update({
          where: { id: pl.id },
          data: { receivedQty: { increment: qty } },
        });
      }

      // PO-র নতুন অবস্থা: সব লাইন পূর্ণ হলে Complete, নইলে Partial Receipt
      const lines = await tx.purchaseOrderLine.findMany({
        where: { poId: po.id },
        select: { quantity: true, receivedQty: true },
      });
      const complete = lines.every((x) => Number(x.receivedQty) >= Number(x.quantity) - EPS);
      const target = complete ? "COMPLETE" : "PARTIAL_RECEIPT";
      let current: string = po.status;
      if (current === "SENT") current = "ACKNOWLEDGED"; // প্রথম মাল আসাই স্বীকৃতি
      if (current !== target) assertTransition(poTransitions, current, target);
      if (po.status !== target) {
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: target } });
      }

      return tx.grn.update({
        where: { id },
        data: { status: "POSTED", postedAt: new Date() },
        include: { lines: true },
      });
    }, TX_OPTIONS);

    await this.audit({
      user, action: "UPDATE", entity: "Grn", entityId: id,
      before: { status: "DRAFT" }, after: { status: "POSTED" },
      reason: overNotes.length > 0 ? `Over-receipt: ${overNotes.join("; ")}` : undefined,
    });
    return posted;
  }

  // শুধু খসড়া বাতিল করা যায়। Post হয়ে গেলে ভুল ঠিক করতে Stock Adjustment লাগে।
  async cancel(id: string, reason: string) {
    const user = await this.guard("grn.create");
    assertRejectionReason(reason);
    const grn = found(await prisma.grn.findUnique({ where: { id } }), "GRN");
    await assertRecordInScope(user, grn.companyId);
    if (grn.status !== "DRAFT") {
      throw new BusinessRuleError("A posted GRN cannot be cancelled. Use a stock adjustment to correct it");
    }
    const row = await prisma.grn.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "Grn", entityId: id,
      before: { status: grn.status }, after: { status: row.status }, reason,
    });
    return row;
  }
}

export const grnService = new GrnService();