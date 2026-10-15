import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRfqReadyToSend, assertSupplierActive } from "@/lib/business-rules";
import { assertTransition, rfqTransitions } from "@/lib/status-rules";
import { nextRfqNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const lineSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(10).optional(),
  requiredDate: z.coerce.date().optional(),
});

const createSchema = z.object({
  prId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  // না দিলে PR-এর লাইনগুলোই নেওয়া হয়
  lines: z.array(lineSchema).optional(),
  supplierIds: z.array(z.string().min(1)).optional(),
});

class RfqService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const r = found(await prisma.rfq.findUnique({ where: { id } }), "RFQ");
    await assertRecordInScope(user, r.companyId);
    return r;
  }

  private async mustBeDraft(user: SessionUser, id: string) {
    const r = await this.load(user, id);
    if (r.status !== "DRAFT") throw new BusinessRuleError("Only a draft RFQ can be edited");
    return r;
  }

  private async checkSupplier(user: SessionUser, supplierId: string) {
    const s = await assertSupplierActive(supplierId);
    if (s.companyId !== user.companyId) throw new BusinessRuleError("Supplier not found");
  }

  async list() {
    const user = await this.guard("rfq.view");
    return prisma.rfq.findMany({
      where: await listFilter(user),
      include: { _count: { select: { lines: true, suppliers: true, quotations: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("rfq.view");
    await this.load(user, id);
    return prisma.rfq.findUnique({
      where: { id },
      include: {
        lines: { include: { material: true } },
        suppliers: { include: { supplier: true } },
        quotations: true,
      },
    });
  }

  // Requirement → RFQ: PR থেকে নিলে লাইন নিজে নিজে আসে
  async create(input: unknown) {
    const user = await this.guard("rfq.create");
    const data = createSchema.parse(input);

    let lines = data.lines ?? [];
    if (data.prId) {
      const pr = found(
        await prisma.purchaseRequisition.findUnique({ where: { id: data.prId }, include: { lines: true } }),
        "PR"
      );
      if (pr.companyId !== user.companyId) throw new BusinessRuleError("PR not found");
      if (pr.status !== "APPROVED") throw new BusinessRuleError("PR must be approved before an RFQ");
      if (lines.length === 0) {
        lines = pr.lines.map((l) => ({
          materialId: l.materialId,
          quantity: Number(l.quantity),
          unit: l.unit,
          requiredDate: l.requiredDate ?? undefined,
        }));
      }
    }
    if (lines.length === 0) throw new BusinessRuleError("An RFQ needs at least one line");

    const supplierIds = [...new Set(data.supplierIds ?? [])];
    for (const s of supplierIds) await this.checkSupplier(user, s);

    const row = await prisma.rfq.create({
      data: {
        companyId: user.companyId,
        rfqNo: await nextRfqNo(user.companyId),
        prId: data.prId,
        dueDate: data.dueDate,
        notes: data.notes,
        createdById: user.id,
        lines: { create: lines },
        suppliers: { create: supplierIds.map((supplierId) => ({ supplierId })) },
      },
      include: { lines: true, suppliers: true },
    });
    await this.audit({ user, action: "CREATE", entity: "Rfq", entityId: row.id, after: row });
    return row;
  }

  async addSupplier(rfqId: string, supplierId: string) {
    const user = await this.guard("rfq.edit");
    await this.mustBeDraft(user, rfqId);
    await this.checkSupplier(user, supplierId);
    const row = await prisma.rfqSupplier.create({ data: { rfqId, supplierId } });
    await this.audit({ user, action: "CREATE", entity: "RfqSupplier", entityId: row.id, after: row });
    return row;
  }

  async removeSupplier(rfqId: string, supplierId: string) {
    const user = await this.guard("rfq.edit");
    await this.mustBeDraft(user, rfqId);
    await prisma.rfqSupplier.deleteMany({ where: { rfqId, supplierId } });
    await this.audit({ user, action: "DELETE", entity: "RfqSupplier", entityId: `${rfqId}:${supplierId}` });
  }

  async addLine(rfqId: string, input: unknown) {
    const user = await this.guard("rfq.edit");
    const data = lineSchema.parse(input);
    await this.mustBeDraft(user, rfqId);
    const m = await prisma.material.findUnique({ where: { id: data.materialId } });
    if (!m || m.companyId !== user.companyId) throw new BusinessRuleError("Material not found");
    const row = await prisma.rfqLine.create({ data: { ...data, rfqId, unit: data.unit ?? m.unit } });
    await this.audit({ user, action: "CREATE", entity: "RfqLine", entityId: row.id, after: row });
    return row;
  }

  async removeLine(lineId: string) {
    const user = await this.guard("rfq.edit");
    const line = found(await prisma.rfqLine.findUnique({ where: { id: lineId } }), "RFQ line");
    await this.mustBeDraft(user, line.rfqId);
    await prisma.rfqLine.delete({ where: { id: lineId } });
    await this.audit({ user, action: "DELETE", entity: "RfqLine", entityId: lineId, before: line });
  }

  // Supplier-দের কাছে পাঠানো (আসল ইমেইল পাঠানো ধাপ ড-তে, Resend দিয়ে)
  async send(id: string) {
    const user = await this.guard("rfq.edit");
    const rfq = await this.load(user, id);
    assertTransition(rfqTransitions, rfq.status, "SENT");
    await assertRfqReadyToSend(id);
    const row = await prisma.$transaction(async (tx) => {
      await tx.rfqSupplier.updateMany({ where: { rfqId: id }, data: { sentAt: new Date() } });
      return tx.rfq.update({ where: { id }, data: { status: "SENT" } });
    });
    await this.audit({
      user, action: "UPDATE", entity: "Rfq", entityId: id,
      before: { status: rfq.status }, after: { status: row.status },
    });
    return row;
  }

  async changeStatus(id: string, to: "CLOSED" | "CANCELLED") {
    const user = await this.guard("rfq.edit");
    const rfq = await this.load(user, id);
    assertTransition(rfqTransitions, rfq.status, to);
    const row = await prisma.rfq.update({ where: { id }, data: { status: to } });
    await this.audit({
      user, action: "UPDATE", entity: "Rfq", entityId: id,
      before: { status: rfq.status }, after: { status: row.status },
    });
    return row;
  }
}

export const rfqService = new RfqService();