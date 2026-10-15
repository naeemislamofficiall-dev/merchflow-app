import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";
import { notify } from "./notification.service";

const submitSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().nonnegative().optional(),
});

const workflowSchema = z
  .object({
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(100),
    entityType: z.string().min(1),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().positive().optional(),
    steps: z
      .array(z.object({ name: z.string().min(1), approverRoleId: z.string().min(1) }))
      .min(1),
  })
  .refine(
    (w) => w.maxAmount === undefined || w.minAmount === undefined || w.maxAmount > w.minAmount,
    { message: "maxAmount must be greater than minAmount" }
  );

// টাকার অংক অনুযায়ী মানানসই নিয়ম খোঁজে (ন্যূনতম সহ, সর্বোচ্চ বাদে)
async function findWorkflow(companyId: string, entityType: string, amount?: number) {
  const list = await prisma.workflow.findMany({
    where: { companyId, entityType, isActive: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  const a = amount ?? 0;
  return (
    list.find((w) => {
      const min = w.minAmount === null ? 0 : Number(w.minAmount);
      const max = w.maxAmount === null ? Infinity : Number(w.maxAmount);
      return a >= min && a < max && w.steps.length > 0;
    }) ?? null
  );
}

class ApprovalService extends BaseService {
  private async notifyApprovers(
    companyId: string,
    roleId: string,
    req: { id: string; title: string; entityType: string; entityId: string }
  ) {
    const approvers = await prisma.user.findMany({
      where: { companyId, roleId, status: "ACTIVE" },
      select: { id: true },
    });
    for (const a of approvers) {
      await notify({
        companyId,
        recipientId: a.id,
        type: "APPROVAL_PENDING",
        title: "Approval pending",
        message: req.title,
        href: `/approvals/${req.id}`,
        entityType: req.entityType,
        entityId: req.entityId,
      });
    }
  }

  // নিয়ম তৈরি (যেমন PO ৫,০০০ থেকে ৫০,০০০ হলে Manager → Head of Procurement)
  async createWorkflow(input: unknown) {
    const user = await this.guard("approval.manage");
    const data = workflowSchema.parse(input);
    const row = await prisma.workflow.create({
      data: {
        companyId: user.companyId,
        code: data.code,
        name: data.name,
        entityType: data.entityType,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        steps: {
          create: data.steps.map((s, i) => ({
            stepOrder: i + 1,
            name: s.name,
            approverRoleId: s.approverRoleId,
          })),
        },
      },
      include: { steps: true },
    });
    await this.audit({ user, action: "CREATE", entity: "Workflow", entityId: row.id, after: row });
    return row;
  }

  async listWorkflows() {
    const user = await this.guard("approval.manage");
    return prisma.workflow.findMany({
      where: { companyId: user.companyId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
      orderBy: { entityType: "asc" },
    });
  }

  // অনুমোদনের অনুরোধ জমা
  async submit(input: unknown) {
    const user = await this.guard("approval.request");
    const data = submitSchema.parse(input);

    const pending = await prisma.approvalRequest.findFirst({
      where: {
        companyId: user.companyId,
        entityType: data.entityType,
        entityId: data.entityId,
        status: "PENDING",
      },
    });
    if (pending) throw new BusinessRuleError("An approval is already pending for this record");

    const workflow = await findWorkflow(user.companyId, data.entityType, data.amount);
    if (!workflow) {
      throw new BusinessRuleError("No approval workflow is set for this record type and amount");
    }

    const first = workflow.steps[0];
    const req = await prisma.approvalRequest.create({
      data: {
        companyId: user.companyId,
        workflowId: workflow.id,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currentStep: first.stepOrder,
        requestedById: user.id,
      },
    });
    await this.notifyApprovers(user.companyId, first.approverRoleId, req);
    await this.audit({ user, action: "CREATE", entity: "ApprovalRequest", entityId: req.id, after: req });
    return req;
  }

  // অনুমোদন বা প্রত্যাখ্যান (প্রত্যাখ্যানে কারণ লাগবে)
  async decide(requestId: string, decision: "APPROVED" | "REJECTED", note?: string) {
    const user = await this.guard("approval.decide");
    if (decision === "REJECTED" && (!note || note.trim().length < 3)) {
      throw new BusinessRuleError("Rejection reason is required");
    }

    const req = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
    });
    if (!req || req.companyId !== user.companyId) {
      throw new BusinessRuleError("Approval request not found");
    }
    if (req.status !== "PENDING") throw new BusinessRuleError("This request is already decided");

    const steps = req.workflow?.steps ?? [];
    const step = steps.find((s) => s.stepOrder === req.currentStep);
    if (!step) throw new BusinessRuleError("Approval step not found");
    if (step.approverRoleId !== user.roleId && !can(user, "*")) {
      throw new BusinessRuleError("You are not the approver for this step");
    }
    const next = steps.find((s) => s.stepOrder > step.stepOrder);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.approvalAction.create({
        data: { requestId, stepOrder: step.stepOrder, approverId: user.id, decision, note },
      });
      if (decision === "REJECTED") {
        return tx.approvalRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED", decidedAt: new Date() },
        });
      }
      if (!next) {
        return tx.approvalRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", decidedAt: new Date() },
        });
      }
      return tx.approvalRequest.update({
        where: { id: requestId },
        data: { currentStep: next.stepOrder },
      });
    });

    if (decision === "APPROVED" && next) {
      await this.notifyApprovers(updated.companyId, next.approverRoleId, updated);
    } else {
      await notify({
        companyId: updated.companyId,
        recipientId: updated.requestedById,
        title: `Request ${updated.status.toLowerCase()}`,
        message: updated.title,
        href: `/approvals/${updated.id}`,
        entityType: updated.entityType,
        entityId: updated.entityId,
      });
    }

    await this.audit({
      user,
      action: "UPDATE",
      entity: "ApprovalRequest",
      entityId: requestId,
      before: { status: req.status, currentStep: req.currentStep },
      after: { status: updated.status, currentStep: updated.currentStep },
      reason: note,
    });
    return updated;
  }

  // আমার অনুমোদনের অপেক্ষায় থাকা অনুরোধ
  async listPending() {
    const user = await this.guard("approval.decide");
    const list = await prisma.approvalRequest.findMany({
      where: { companyId: user.companyId, status: "PENDING" },
      include: { workflow: { include: { steps: true } } },
      orderBy: { requestedAt: "asc" },
    });
    return list.filter((r) => {
      const step = r.workflow?.steps.find((s) => s.stepOrder === r.currentStep);
      return !!step && (step.approverRoleId === user.roleId || can(user, "*"));
    });
  }

  // আমি যেগুলো জমা দিয়েছি
  async listMine() {
    const user = await this.guard("approval.request");
    return prisma.approvalRequest.findMany({
      where: { companyId: user.companyId, requestedById: user.id },
      orderBy: { requestedAt: "desc" },
    });
  }

  async cancel(requestId: string) {
    const user = await this.guard("approval.request");
    const req = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
    if (!req || req.requestedById !== user.id) {
      throw new BusinessRuleError("Approval request not found");
    }
    if (req.status !== "PENDING") throw new BusinessRuleError("Only a pending request can be cancelled");
    const row = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });
    await this.audit({ user, action: "UPDATE", entity: "ApprovalRequest", entityId: requestId, after: row });
    return row;
  }
}

export const approvalService = new ApprovalService();