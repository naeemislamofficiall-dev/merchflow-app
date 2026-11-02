import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";
import { notify } from "./notification.service";
import { daysPending, delegationCovers, shouldEscalate } from "@/lib/approval-calc";

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
    escalateAfterDays: z.number().int().positive().max(60).optional(),
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
    req: { id: string; title: string; entityType: string; entityId: string },
    title = "Approval pending"
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
        title,
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
        escalateAfterDays: data.escalateAfterDays,
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
    let delegatedFromId: string | undefined;
    if (step.approverRoleId !== user.roleId && !can(user, "*")) {
      const from = (await this.activeDelegations(user)).find((x) => x.fromUser.roleId === step.approverRoleId);
      if (!from) throw new BusinessRuleError("You are not the approver for this step");
      delegatedFromId = from.fromUserId;
    }
    const next = steps.find((s) => s.stepOrder > step.stepOrder);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.approvalAction.create({
        data: { requestId, stepOrder: step.stepOrder, approverId: user.id, delegatedFromId, decision, note },
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
      after: { status: updated.status, currentStep: updated.currentStep, decidedBy: user.id, onBehalfOf: delegatedFromId },
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
    const roleIds = new Set([user.roleId, ...(await this.activeDelegations(user)).map((x) => x.fromUser.roleId)]);
    return list.filter((r) => {
      const step = r.workflow?.steps.find((s) => s.stepOrder === r.currentStep);
      return !!step && (roleIds.has(step.approverRoleId) || can(user, "*"));
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

    // ---------- Delegation ----------
  private async activeDelegations(user: { id: string; companyId: string }) {
    const list = await prisma.approvalDelegation.findMany({
      where: { companyId: user.companyId, toUserId: user.id, isActive: true },
      include: { fromUser: { select: { id: true, roleId: true, status: true } } },
    });
    const now = new Date();
    return list.filter((d) => d.fromUser.status === "ACTIVE" && delegationCovers(d, now));
  }

  async delegate(input: unknown) {
    const user = await this.guard("approval.decide");
    const d = z
      .object({
        toUserId: z.string().min(1),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        reason: z.string().min(3).max(300),
      })
      .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date" })
      .parse(input);
    if (d.toUserId === user.id) throw new BusinessRuleError("You cannot delegate to yourself");
    const to = await prisma.user.findUnique({ where: { id: d.toUserId } });
    if (!to || to.companyId !== user.companyId || to.status !== "ACTIVE") {
      throw new BusinessRuleError("Delegate user not found");
    }
    const row = await prisma.approvalDelegation.create({
      data: { companyId: user.companyId, fromUserId: user.id, toUserId: to.id, startDate: d.startDate, endDate: d.endDate, reason: d.reason, createdById: user.id },
    });
    await notify({
      companyId: user.companyId,
      recipientId: to.id,
      title: "Approval delegated to you",
      message: `${user.email} delegated approvals to you until ${d.endDate.toISOString().slice(0, 10)}`,
      href: "/approvals",
    });
    await this.audit({ user, action: "CREATE", entity: "ApprovalDelegation", entityId: row.id, after: row, reason: d.reason });
    return row;
  }

  async revokeDelegation(id: string) {
    const user = await this.guard("approval.decide");
    const row = await prisma.approvalDelegation.findUnique({ where: { id } });
    if (!row || row.companyId !== user.companyId || row.fromUserId !== user.id) {
      throw new BusinessRuleError("Delegation not found");
    }
    const saved = await prisma.approvalDelegation.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } });
    await this.audit({ user, action: "UPDATE", entity: "ApprovalDelegation", entityId: id, before: row, after: saved });
    return saved;
  }

  async listDelegations() {
    const user = await this.guard("approval.decide");
    const [given, received] = await Promise.all([
      prisma.approvalDelegation.findMany({ where: { companyId: user.companyId, fromUserId: user.id }, include: { toUser: { select: { name: true, email: true } } }, orderBy: { startDate: "desc" } }),
      prisma.approvalDelegation.findMany({ where: { companyId: user.companyId, toUserId: user.id }, include: { fromUser: { select: { name: true, email: true } } }, orderBy: { startDate: "desc" } }),
    ]);
    return { given, received };
  }

  // ---------- Escalation: pending > N din -> porer step-er role-ke notify ----------
  // ---------- Escalation: pending > N din -> porer step-er role-ke notify ----------
  async escalateOverdue(now = new Date()) {
    const user = await this.guard("approval.manage");
    const list = await prisma.approvalRequest.findMany({
      where: { companyId: user.companyId, status: "PENDING", workflow: { escalateAfterDays: { not: null } } },
      include: {
        workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
        actions: { orderBy: { decidedAt: "desc" }, take: 1 },
        escalations: true,
      },
    });
    let escalated = 0;
    for (const r of list) {
      const since = r.actions[0]?.decidedAt ?? r.requestedAt;
      const already = r.escalations.some((e) => e.stepOrder === r.currentStep);
      if (!shouldEscalate(since, now, r.workflow?.escalateAfterDays, already)) continue;
      const next = (r.workflow?.steps ?? []).find((s) => s.stepOrder > r.currentStep);
      await prisma.approvalEscalation.create({
        data: { requestId: r.id, stepOrder: r.currentStep, escalatedToRoleId: next?.approverRoleId },
      });
      if (next) {
        await this.notifyApprovers(r.companyId, next.approverRoleId, r, "Approval overdue (escalated)");
      } else {
        await notify({
          companyId: r.companyId,
          recipientId: r.requestedById,
          title: "Approval overdue",
          message: r.title,
          href: `/approvals/${r.id}`,
          entityType: r.entityType,
          entityId: r.entityId,
        });
      }
      await this.audit({
        user, action: "UPDATE", entity: "ApprovalRequest", entityId: r.id,
        after: { escalatedStep: r.currentStep, toRoleId: next?.approverRoleId ?? null },
        reason: `Pending more than ${r.workflow?.escalateAfterDays} day(s)`,
      });
      escalated++;
    }
    return { escalated };
  }

  // ---------- "Who is pending" ----------
  async requestDetail(id: string) {
    let user;
    try {
      user = await this.guard("approval.decide");
    } catch {
      user = await this.guard("approval.request");
    }
    const req = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { name: true, email: true } },
        workflow: { include: { steps: { orderBy: { stepOrder: "asc" }, include: { approverRole: true } } } },
        actions: { orderBy: { decidedAt: "asc" }, include: { approver: { select: { id: true, name: true, email: true } } } },
        escalations: true,
      },
    });
    if (!req || req.companyId !== user.companyId) throw new BusinessRuleError("Approval request not found");
    const steps = req.workflow?.steps ?? [];
    const current = steps.find((s) => s.stepOrder === req.currentStep);
    const waitingOn: { id: string; name: string; email: string; via: string | null }[] = [];
    if (req.status === "PENDING" && current) {
      const holders = await prisma.user.findMany({
        where: { companyId: req.companyId, roleId: current.approverRoleId, status: "ACTIVE" },
        select: { id: true, name: true, email: true },
      });
      const dels = (
        await prisma.approvalDelegation.findMany({
          where: { companyId: req.companyId, isActive: true, fromUserId: { in: holders.map((h) => h.id) } },
          include: { toUser: { select: { id: true, name: true, email: true } } },
        })
      ).filter((x) => delegationCovers(x, new Date()));
      for (const h of holders) waitingOn.push({ ...h, via: null });
      for (const x of dels) {
        waitingOn.push({ ...x.toUser, via: `Delegate of ${holders.find((h) => h.id === x.fromUserId)?.name ?? "approver"}` });
      }
    }
    const since = req.actions.length ? req.actions[req.actions.length - 1].decidedAt : req.requestedAt;
    return { req, steps, current, waitingOn, pendingDays: req.status === "PENDING" ? daysPending(since, new Date()) : 0 };
  }
  
    // Workflow-e escalation din set/off (null = off)
  async setEscalation(workflowId: string, days: number | null) {
    const user = await this.guard("approval.manage");
    const v = z.number().int().positive().max(60).nullable().parse(days);
    const before = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!before || before.companyId !== user.companyId) throw new BusinessRuleError("Workflow not found");
    const saved = await prisma.workflow.update({ where: { id: workflowId }, data: { escalateAfterDays: v } });
    await this.audit({ user, action: "UPDATE", entity: "Workflow", entityId: workflowId, before: { escalateAfterDays: before.escalateAfterDays }, after: { escalateAfterDays: saved.escalateAfterDays } });
    return saved;
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