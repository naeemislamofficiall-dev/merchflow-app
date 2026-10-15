import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertPrReadyForSubmit, assertRejectionReason } from "@/lib/business-rules";
import { assertTransition, prTransitions } from "@/lib/status-rules";
import {
  approvalNeeded,
  assertApprovalAllows,
  assertRecordInScope,
  found,
  listFilter,
} from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { PrStatus } from "@/generated/prisma/enums";
import { approvalService } from "./approval.service";
import { BaseService } from "./base.service";
import { inventoryService } from "./inventory.service";

const lineSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(10).optional(),
  requiredDate: z.coerce.date().optional(),
  remarks: z.string().max(300).optional(),
});

// MRP থেকে PR আলাদা পথে বানানো হয় (mrpService.createPr)। এখানে বাকি চার উৎস।
const createSchema = z.object({
  source: z.enum(["DEPARTMENT", "REORDER_POINT", "MANUAL", "PRODUCTION_PLAN"]).optional(),
  departmentId: z.string().optional(),
  orderId: z.string().optional(),
  styleId: z.string().optional(),
  reason: z.string().max(500).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  requiredDate: z.coerce.date().optional(),
  lines: z.array(lineSchema).min(1),
});

class PrService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const pr = found(await prisma.purchaseRequisition.findUnique({ where: { id } }), "PR");
    await assertRecordInScope(user, pr.companyId);
    return pr;
  }

  private async checkMaterials(user: SessionUser, ids: string[]) {
    const unique = [...new Set(ids)];
    const list = await prisma.material.findMany({
      where: { id: { in: unique }, companyId: user.companyId, status: "ACTIVE" },
    });
    if (list.length !== unique.length) throw new BusinessRuleError("Some materials were not found or are inactive");
    return new Map(list.map((m) => [m.id, m]));
  }

  async list(filter: { status?: PrStatus; orderId?: string } = {}) {
    const user = await this.guard("pr.view");
    return prisma.purchaseRequisition.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("pr.view");
    await this.load(user, id);
    return prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { lines: { include: { material: true } }, department: true },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("pr.create");
    const data = createSchema.parse(input);
    const mats = await this.checkMaterials(user, data.lines.map((l) => l.materialId));

    if (data.departmentId) {
      const d = await prisma.department.findUnique({
        where: { id: data.departmentId },
        include: { factory: true },
      });
      if (!d || d.factory.companyId !== user.companyId) throw new BusinessRuleError("Department not found");
    }
    if (data.orderId) {
      const o = await prisma.order.findUnique({ where: { id: data.orderId } });
      if (!o || o.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    }
    if (data.styleId) {
      const s = await prisma.style.findUnique({ where: { id: data.styleId } });
      if (!s || s.companyId !== user.companyId) throw new BusinessRuleError("Style not found");
    }

    const { lines, ...header } = data;
    const { nextPrNo } = await import("@/lib/numbering");
    const row = await prisma.purchaseRequisition.create({
      data: {
        ...header,
        companyId: user.companyId,
        prNo: await nextPrNo(user.companyId),
        createdById: user.id,
        lines: {
          create: lines.map((l) => ({ ...l, unit: l.unit ?? mats.get(l.materialId)!.unit })),
        },
      },
      include: { lines: true },
    });
    await this.audit({ user, action: "CREATE", entity: "PurchaseRequisition", entityId: row.id, after: row });
    return row;
  }

  async addLine(prId: string, input: unknown) {
    const user = await this.guard("pr.edit");
    const data = lineSchema.parse(input);
    const pr = await this.load(user, prId);
    if (pr.status !== "DRAFT") throw new BusinessRuleError("Only a draft PR can be edited");
    const mats = await this.checkMaterials(user, [data.materialId]);
    const row = await prisma.purchaseRequisitionLine.create({
      data: { ...data, prId, unit: data.unit ?? mats.get(data.materialId)!.unit },
    });
    await this.audit({ user, action: "CREATE", entity: "PurchaseRequisitionLine", entityId: row.id, after: row });
    return row;
  }

  async removeLine(lineId: string) {
    const user = await this.guard("pr.edit");
    const line = found(await prisma.purchaseRequisitionLine.findUnique({ where: { id: lineId } }), "PR line");
    const pr = await this.load(user, line.prId);
    if (pr.status !== "DRAFT") throw new BusinessRuleError("Only a draft PR can be edited");
    await prisma.purchaseRequisitionLine.delete({ where: { id: lineId } });
    await this.audit({ user, action: "DELETE", entity: "PurchaseRequisitionLine", entityId: lineId, before: line });
  }

  async submit(id: string) {
    const user = await this.guard("pr.edit");
    const pr = await this.load(user, id);
    assertTransition(prTransitions, pr.status, "SUBMITTED");
    await assertPrReadyForSubmit(id);

    if (await approvalNeeded(pr.companyId, "PurchaseRequisition")) {
      await approvalService.submit({
        entityType: "PurchaseRequisition",
        entityId: id,
        title: `PR ${pr.prNo}`,
      });
    }
    const row = await prisma.purchaseRequisition.update({ where: { id }, data: { status: "SUBMITTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseRequisition", entityId: id,
      before: { status: pr.status }, after: { status: row.status },
    });
    return row;
  }

  async approve(id: string) {
    const user = await this.guard("pr.approve");
    const pr = await this.load(user, id);
    assertTransition(prTransitions, pr.status, "APPROVED");
    await assertApprovalAllows(pr.companyId, "PurchaseRequisition", id);
    const row = await prisma.purchaseRequisition.update({ where: { id }, data: { status: "APPROVED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseRequisition", entityId: id,
      before: { status: pr.status }, after: { status: row.status },
    });
    return row;
  }

  async reject(id: string, reason: string) {
    const user = await this.guard("pr.approve");
    assertRejectionReason(reason);
    const pr = await this.load(user, id);
    assertTransition(prTransitions, pr.status, "REJECTED");
    const row = await prisma.purchaseRequisition.update({ where: { id }, data: { status: "REJECTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseRequisition", entityId: id,
      before: { status: pr.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // Rejected PR আবার Draft-এ আনা, Cancelled, Closed
  async changeStatus(id: string, to: "DRAFT" | "CANCELLED" | "CLOSED") {
    const user = await this.guard("pr.edit");
    const pr = await this.load(user, id);
    assertTransition(prTransitions, pr.status, to);
    const row = await prisma.purchaseRequisition.update({ where: { id }, data: { status: to } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseRequisition", entityId: id,
      before: { status: pr.status }, after: { status: row.status },
    });
    return row;
  }

  // Reorder point-এর নিচে নামা মালের জন্য এক ক্লিকে DRAFT PR (সেকশন ১৭: উৎস REORDER_POINT)
  // materialIds দিলে শুধু ওই মালগুলো, না দিলে সব। ঘাটতি পরিমাণই PR-এর পরিমাণ।
  async createFromReorder(materialIds?: string[]) {
    await this.guard("pr.create");
    const picked = z.array(z.string().min(1)).optional().parse(materialIds);
    const suggestions = (await inventoryService.reorderSuggestions()).filter(
      (m) => !picked || picked.includes(m.materialId)
    );
    if (suggestions.length === 0) throw new BusinessRuleError("No material is below its reorder point");
    return this.create({
      source: "REORDER_POINT",
      reason: "Below reorder point",
      lines: suggestions.map((m) => ({
        materialId: m.materialId,
        quantity: Math.ceil(m.shortBy * 10000) / 10000,
        unit: m.unit,
        remarks: `Stock position ${m.position} / reorder point ${m.reorderPoint}`,
      })),
    });
  }
}

export const prService = new PrService();