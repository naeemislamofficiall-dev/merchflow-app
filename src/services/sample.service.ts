import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason, assertStyleOpen } from "@/lib/business-rules";
import { assertTransition, sampleTransitions } from "@/lib/status-rules";
import { nextSampleNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { SampleStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const sampleTypes = [
  "PROTO", "FIT", "SIZE_SET", "SALESMAN", "SMS", "PP", "TOP", "SHIPMENT", "PHOTO", "WASH_TEST",
] as const;

const createSchema = z.object({
  styleId: z.string().min(1),
  orderId: z.string().optional(),
  sampleType: z.enum(sampleTypes),
  quantity: z.number().int().positive().optional(),
  dueDate: z.coerce.date().optional(),
  assignedDepartmentId: z.string().optional(),
  assignedToId: z.string().optional(),
  materialRequirement: z.string().max(1000).optional(),
  cost: z.number().nonnegative().optional(),
  plannedCompletion: z.coerce.date().optional(),
  comments: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = createSchema.omit({ styleId: true, orderId: true, sampleType: true }).partial();

class SampleService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const s = found(await prisma.sampleRequest.findUnique({ where: { id } }), "Sample");
    await assertRecordInScope(user, s.companyId);
    return s;
  }

  async list(filter: { styleId?: string; status?: SampleStatus } = {}) {
    const user = await this.guard("sample.view");
    return prisma.sampleRequest.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.styleId ? { styleId: filter.styleId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { style: { select: { styleNo: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("sample.view");
    await this.load(user, id);
    return prisma.sampleRequest.findUnique({
      where: { id },
      include: { style: true, approvals: { orderBy: { round: "asc" } }, assignedTo: { select: { name: true } } },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("sample.create");
    const data = createSchema.parse(input);
    const style = await assertStyleOpen(data.styleId);
    if (style.companyId !== user.companyId) throw new BusinessRuleError("Style not found");
    if (data.orderId) {
      const o = found(await prisma.order.findUnique({ where: { id: data.orderId } }), "Order");
      if (o.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    }
    const row = await prisma.sampleRequest.create({
      data: {
        ...data,
        companyId: user.companyId,
        sampleNo: await nextSampleNo(user.companyId),
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "SampleRequest", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("sample.edit");
    const before = await this.load(user, id);
    if (before.status === "APPROVED" || before.status === "CANCELLED") {
      throw new BusinessRuleError("This sample can no longer be edited");
    }
    const data = updateSchema.parse(input);
    const row = await prisma.sampleRequest.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "SampleRequest", entityId: id, before, after: row });
    return row;
  }

  // Requested → In Development → Internal QC → Sent → Buyer Review (সেকশন ৫৮)
  // বায়ারের সিদ্ধান্ত (Approved/Rejected) decide() দিয়ে হয়
  async changeStatus(id: string, to: SampleStatus, extra: { courier?: string; trackingNo?: string } = {}) {
    const user = await this.guard("sample.edit");
    if (to === "APPROVED" || to === "REJECTED") {
      throw new BusinessRuleError("Use decide() for the buyer's decision");
    }
    const s = await this.load(user, id);
    assertTransition(sampleTransitions, s.status, to);

    const data: {
      status: SampleStatus;
      actualCompletion?: Date;
      sentDate?: Date;
      courier?: string;
      trackingNo?: string;
      revisionCount?: { increment: number };
    } = { status: to };
    if (to === "INTERNAL_QC") data.actualCompletion = new Date();
    if (to === "SENT") {
      data.sentDate = new Date();
      data.courier = extra.courier;
      data.trackingNo = extra.trackingNo;
    }
    if (to === "REVISION") data.revisionCount = { increment: 1 };

    const row = await prisma.sampleRequest.update({ where: { id }, data });
    await this.audit({
      user, action: "UPDATE", entity: "SampleRequest", entityId: id,
      before: { status: s.status }, after: { status: row.status },
    });
    return row;
  }

  // বায়ারের সিদ্ধান্ত। প্রত্যাখ্যানে কারণ লাগবে। প্রতিটা রাউন্ড আলাদা রেকর্ড হয়।
  async decide(id: string, decision: "APPROVED" | "REJECTED", comments?: string) {
    const user = await this.guard("sample.edit");
    const s = await this.load(user, id);
    if (s.status !== "BUYER_REVIEW") {
      throw new BusinessRuleError("The sample must be in buyer review first");
    }
    if (decision === "REJECTED") assertRejectionReason(comments);

    const round = (await prisma.sampleApproval.count({ where: { sampleId: id } })) + 1;
    const row = await prisma.$transaction(async (tx) => {
      await tx.sampleApproval.create({ data: { sampleId: id, round, decision, comments } });
      return tx.sampleRequest.update({
        where: { id },
        data: { status: decision, buyerResponse: comments },
      });
    });
    await this.audit({
      user, action: "UPDATE", entity: "SampleRequest", entityId: id,
      before: { status: s.status }, after: { status: row.status }, reason: comments,
    });
    return row;
  }
}

export const sampleService = new SampleService();