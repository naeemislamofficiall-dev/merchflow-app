import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { can } from "@/lib/permissions";
import { nextIssueNo, nextReturnNo } from "@/lib/numbering";
import {
  EPS,
  TX_OPTIONS,
  advisoryLock,
  allowedForOrder,
  loadWarehouse,
  lockMaterials,
  negativeStockAllowed,
  netIssuedForOrder,
  onHand,
  reservedQty,
  usableOnHand,
} from "@/lib/stock";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const issueLine = z.object({
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  lotId: z.string().optional(),
  rollId: z.string().optional(),
  binId: z.string().optional(),
});

const issueSchema = z.object({
  warehouseId: z.string().min(1),
  targetType: z.enum(["PRODUCTION_ORDER", "CUTTING_ORDER", "SAMPLE", "DEPARTMENT", "SUBCONTRACT"]),
  orderId: z.string().optional(),
  sampleId: z.string().optional(),
  departmentId: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNo: z.string().max(60).optional(),
  overrideReason: z.string().max(300).optional(),
  remarks: z.string().max(500).optional(),
  lines: z.array(issueLine).min(1),
});

const returnSchema = z.object({
  issueId: z.string().min(1),
  reason: z.string().min(3).max(300),
  remarks: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        issueLineId: z.string().min(1),
        quantity: z.number().positive(),
        binId: z.string().optional(),
      })
    )
    .min(1),
});

class MaterialIssueService extends BaseService {
  async list(filter: { orderId?: string } = {}) {
    const user = await this.guard("inventory.view");
    return prisma.materialIssue.findMany({
      where: { ...(await listFilter(user)), ...(filter.orderId ? { orderId: filter.orderId } : {}) },
      include: { lines: true },
      orderBy: { issuedAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("inventory.view");
    const issue = found(await prisma.materialIssue.findUnique({ where: { id } }), "Issue");
    await assertRecordInScope(user, issue.companyId);
    return prisma.materialIssue.findUnique({
      where: { id },
      include: { lines: { include: { material: true } }, returns: { include: { lines: true } }, warehouse: true },
    });
  }

  // ইস্যু: অনুমোদিত সীমা, উপলব্ধ স্টক আর রোলের অবস্থা দেখে মাল দেয়।
  // সীমার বেশি বা Conditional রোল দিতে inventory.override permission ও কারণ লাগে।
  async issue(input: unknown) {
    const user = await this.guard("inventory.issue");
    const d = issueSchema.parse(input);
    await loadWarehouse(user, d.warehouseId);

    // কার জন্য দিচ্ছি: তা যাচাই
    if (d.targetType === "SAMPLE") {
      if (!d.sampleId) throw new BusinessRuleError("Sample is required");
      const s = found(await prisma.sampleRequest.findUnique({ where: { id: d.sampleId } }), "Sample");
      if (s.companyId !== user.companyId) throw new BusinessRuleError("Sample not found");
    } else if (d.targetType === "DEPARTMENT") {
      if (!d.departmentId) throw new BusinessRuleError("Department is required");
      const dep = found(
        await prisma.department.findUnique({ where: { id: d.departmentId }, include: { factory: true } }),
        "Department"
      );
      if (dep.factory.companyId !== user.companyId) throw new BusinessRuleError("Department not found");
    } else if (!d.orderId) {
      throw new BusinessRuleError("Order is required"); // Production Order আসবে ধাপ চ-তে
    }
    if (d.orderId) {
      const o = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
      if (o.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
      if (o.status === "CANCELLED" || o.status === "CLOSED") {
        throw new BusinessRuleError("Cannot issue material to a closed or cancelled order");
      }
    }
    // Production / Cutting order জোড়া (referenceId): আসল record কিনা, আর একই অর্ডারের কিনা
    if (d.referenceId && d.targetType === "PRODUCTION_ORDER") {
      const p = found(await prisma.productionOrder.findUnique({ where: { id: d.referenceId } }), "Production order");
      if (p.companyId !== user.companyId || p.orderId !== d.orderId) {
        throw new BusinessRuleError("The production order does not belong to this order");
      }
    }
    if (d.referenceId && d.targetType === "CUTTING_ORDER") {
      const c = found(
        await prisma.cutPlan.findUnique({ where: { id: d.referenceId }, include: { productionOrder: true } }),
        "Cut plan"
      );
      if (c.companyId !== user.companyId || c.productionOrder.orderId !== d.orderId) {
        throw new BusinessRuleError("The cut plan does not belong to this order");
      }
    }
    
    // মাল ও রোল যাচাই
    const matIds = [...new Set(d.lines.map((l) => l.materialId))];
    const mats = await prisma.material.findMany({ where: { id: { in: matIds }, companyId: user.companyId } });
    if (mats.length !== matIds.length) throw new BusinessRuleError("Some materials were not found");
    const matById = new Map(mats.map((m) => [m.id, m]));

    const rollIds = d.lines.map((l) => l.rollId).filter((x): x is string => !!x);
    const rolls = await prisma.fabricRoll.findMany({ where: { id: { in: rollIds }, companyId: user.companyId } });
    const rollById = new Map(rolls.map((r) => [r.id, r]));

    let needsOverride = false;
    const notes: string[] = [];
    for (const l of d.lines) {
      if (l.binId) await loadWarehouse(user, d.warehouseId, l.binId);
      if (!l.rollId) continue;
      const roll = rollById.get(l.rollId);
      if (!roll || roll.materialId !== l.materialId || roll.warehouseId !== d.warehouseId) {
        throw new BusinessRuleError("Roll is not in this warehouse for this material");
      }
      if (roll.inspectionStatus === "REJECTED") throw new BusinessRuleError(`Roll ${roll.rollNo} is rejected`);
      if (roll.inspectionStatus === "PENDING") throw new BusinessRuleError(`Inspect roll ${roll.rollNo} first`);
      if (roll.inspectionStatus === "CONDITIONAL") {
        needsOverride = true;
        notes.push(`Roll ${roll.rollNo} is conditional`);
      }
    }

    const issue = await prisma.$transaction(async (tx) => {
      await lockMaterials(tx, user.companyId, matIds);
      await advisoryLock(tx, `seq:issue:${user.companyId}`);
      const negOk = await negativeStockAllowed(tx, user.companyId);

      // মাল ধরে মোট চাওয়া পরিমাণ
      const totals = new Map<string, number>();
      for (const l of d.lines) totals.set(l.materialId, (totals.get(l.materialId) ?? 0) + l.quantity);

      for (const [materialId, qty] of totals) {
        const code = matById.get(materialId)!.code;

        // অনুমোদিত সীমা: অর্ডারের Approved BOM-এর চাহিদা − আগে দেওয়া মাল
        if (d.orderId) {
          const allowed = await allowedForOrder(tx, d.orderId, materialId);
          const done = await netIssuedForOrder(tx, user.companyId, d.orderId, materialId);
          if (qty > allowed - done + EPS) {
            needsOverride = true;
            notes.push(`${code}: allowed ${Math.max(allowed - done, 0)}, requested ${qty}`);
          }
        }
        // অন্য অর্ডারের জন্য সংরক্ষিত মাল দেওয়া যাবে না
        const usableAll = await usableOnHand(tx, { companyId: user.companyId, materialId });
        const others = await reservedQty(tx, { companyId: user.companyId, materialId, excludeOrderId: d.orderId });
        if (!negOk && qty > usableAll - others + EPS) {
          throw new BusinessRuleError(
            `${code}: not enough available stock (available ${Math.max(usableAll - others, 0)}, requested ${qty})`
          );
        }
      }

      // নির্দিষ্ট জায়গার (লট/রোল/bin) হাতে থাকা মাল
      const wanted = new Map<string, { qty: number; line: (typeof d.lines)[number]; lotId?: string }>();
      for (const l of d.lines) {
        const lotId = l.rollId ? rollById.get(l.rollId)!.lotId : l.lotId;
        const key = `${l.materialId}|${lotId ?? ""}|${l.rollId ?? ""}|${l.binId ?? ""}`;
        const prev = wanted.get(key);
        wanted.set(key, { qty: (prev?.qty ?? 0) + l.quantity, line: l, lotId });
      }
      for (const w of wanted.values()) {
        const have = await onHand(tx, {
          companyId: user.companyId, materialId: w.line.materialId, warehouseId: d.warehouseId,
          lotId: w.lotId, rollId: w.line.rollId, binId: w.line.binId,
        });
        if (!negOk && w.qty > have + EPS) {
          throw new BusinessRuleError(`${matById.get(w.line.materialId)!.code}: only ${have} is in this location`);
        }
      }

      // নিয়ম: সীমার বেশি বা Conditional রোল শুধু অনুমোদিত ব্যক্তি, কারণ সহ
      if (needsOverride) {
        if (!can(user, "inventory.override")) {
          throw new BusinessRuleError(`Needs authorization: ${notes.join("; ")}`);
        }
        if (!d.overrideReason || d.overrideReason.trim().length < 3) {
          throw new BusinessRuleError("Override reason is required");
        }
      }

      const row = await tx.materialIssue.create({
        data: {
          companyId: user.companyId,
          issueNo: await nextIssueNo(user.companyId),
          warehouseId: d.warehouseId,
          targetType: d.targetType,
          orderId: d.orderId,
          sampleId: d.sampleId,
          departmentId: d.departmentId,
          referenceId: d.referenceId,
          referenceNo: d.referenceNo,
          overrideReason: needsOverride ? d.overrideReason : undefined,
          remarks: d.remarks,
          issuedById: user.id,
          lines: {
            create: d.lines.map((l) => ({
              materialId: l.materialId,
              lotId: l.rollId ? rollById.get(l.rollId)!.lotId : l.lotId,
              rollId: l.rollId,
              binId: l.binId,
              quantity: l.quantity,
              unit: matById.get(l.materialId)!.unit,
            })),
          },
        },
        include: { lines: true },
      });

      for (const l of row.lines) {
        await tx.stockTransaction.create({
          data: {
            companyId: user.companyId,
            materialId: l.materialId,
            lotId: l.lotId,
            rollId: l.rollId,
            warehouseId: d.warehouseId,
            binId: l.binId,
            type: "ISSUE",
            quantity: -Number(l.quantity),
            unit: l.unit,
            orderId: d.orderId,
            refType: "MaterialIssue",
            refId: row.id,
            createdById: user.id,
          },
        });
      }

      // এই অর্ডারের সংরক্ষণ থেকে যতটা দেওয়া হলো ততটা "ব্যবহৃত" ধরা (পুরনো আগে)
      if (d.orderId) {
        for (const [materialId, qty] of totals) {
          let left = qty;
          const list = await tx.stockReservation.findMany({
            where: { companyId: user.companyId, materialId, orderId: d.orderId, status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
          });
          for (const r of list) {
            if (left <= 0) break;
            const remaining = Number(r.quantity) - Number(r.consumedQty);
            const take = Math.min(remaining, left);
            const consumed = Number(r.consumedQty) + take;
            await tx.stockReservation.update({
              where: { id: r.id },
              data: {
                consumedQty: consumed,
                status: consumed >= Number(r.quantity) - EPS ? "CONSUMED" : "ACTIVE",
              },
            });
            left -= take;
          }
        }
      }
      return row;
    }, TX_OPTIONS);

    await this.audit({
      user, action: "CREATE", entity: "MaterialIssue", entityId: issue.id, after: issue,
      reason: issue.overrideReason ?? undefined,
    });
    return issue;
  }

  // ফেরত: যা দেওয়া হয়েছিল তার বেশি ফেরত নেওয়া যায় না
  async returnToStore(input: unknown) {
    const user = await this.guard("inventory.return");
    const d = returnSchema.parse(input);
    const issue = found(
      await prisma.materialIssue.findUnique({ where: { id: d.issueId }, include: { lines: true } }),
      "Issue"
    );
    await assertRecordInScope(user, issue.companyId);

    const seen = new Set<string>();
    for (const l of d.lines) {
      if (seen.has(l.issueLineId)) throw new BusinessRuleError("An issue line can appear only once");
      seen.add(l.issueLineId);
      const il = issue.lines.find((x) => x.id === l.issueLineId);
      if (!il) throw new BusinessRuleError("Line does not belong to this issue");
      const left = Number(il.quantity) - Number(il.returnedQty);
      if (l.quantity > left + EPS) throw new BusinessRuleError(`Only ${left} can be returned for this line`);
      if (l.binId) await loadWarehouse(user, issue.warehouseId, l.binId);
    }

    const row = await prisma.$transaction(async (tx) => {
      await lockMaterials(tx, user.companyId, issue.lines.map((l) => l.materialId));
      await advisoryLock(tx, `seq:return:${user.companyId}`);

      const ret = await tx.materialReturn.create({
        data: {
          companyId: user.companyId,
          returnNo: await nextReturnNo(user.companyId),
          issueId: issue.id,
          reason: d.reason,
          remarks: d.remarks,
          returnedById: user.id,
          lines: { create: d.lines },
        },
        include: { lines: true },
      });

      for (const l of d.lines) {
        const il = issue.lines.find((x) => x.id === l.issueLineId)!;
        await tx.stockTransaction.create({
          data: {
            companyId: user.companyId,
            materialId: il.materialId,
            lotId: il.lotId,
            rollId: il.rollId,
            warehouseId: issue.warehouseId,
            binId: l.binId ?? il.binId,
            type: "RETURN",
            quantity: l.quantity,
            unit: il.unit,
            orderId: issue.orderId,
            refType: "MaterialReturn",
            refId: ret.id,
            remarks: d.reason,
            createdById: user.id,
          },
        });
        await tx.materialIssueLine.update({
          where: { id: il.id },
          data: { returnedQty: { increment: l.quantity } },
        });
      }
      return ret;
    }, TX_OPTIONS);

    await this.audit({
      user, action: "CREATE", entity: "MaterialReturn", entityId: row.id, after: row, reason: d.reason,
    });
    return row;
  }
}

export const materialIssueService = new MaterialIssueService();