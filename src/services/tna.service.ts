import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { buildTnaTasks, delayDays as calcDelayDays } from "@/lib/calculations";
import { assertRecordInScope, daysBetween, found, listFilter, startOfDay } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { TnaTaskStatus } from "@/generated/prisma/enums";
import { notify } from "./notification.service";
import { BaseService } from "./base.service";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  tasks: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        daysBefore: z.number().int().nonnegative(),
        sortOrder: z.number().int().nonnegative().optional(),
        dependsOnSortOrder: z.number().int().nonnegative().optional(),
      })
    )
    .min(1),
});

const planSchema = z.object({
  styleId: z.string().min(1),
  orderId: z.string().optional(),
  templateId: z.string().min(1),
  shipDate: z.coerce.date().optional(),
});

const taskPatchSchema = z.object({
  status: z.enum(["NOT_STARTED", "ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED", "WAIVED"]).optional(),
  revisedDate: z.coerce.date().optional(),
  actualDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  departmentId: z.string().optional(),
  delayReason: z.string().max(500).optional(),
});

const RISK_WINDOW_DAYS = 3; // তারিখ এত দিনের মধ্যে এলে আর আগের কাজ বাকি থাকলে AT_RISK

const isClosed = (s: TnaTaskStatus) => s === "COMPLETED" || s === "WAIVED";

class TnaService extends BaseService {
  private async loadPlan(user: SessionUser, id: string) {
    const plan = found(await prisma.tnaPlan.findUnique({ where: { id } }), "T&A plan");
    await assertRecordInScope(user, plan.companyId);
    return plan;
  }

  // ---------- Template ----------

  async createTemplate(input: unknown) {
    const user = await this.guard("tna.create");
    const data = templateSchema.parse(input);
    const tasks = data.tasks.map((t, i) => ({ ...t, sortOrder: t.sortOrder ?? i }));
    if (new Set(tasks.map((t) => t.sortOrder)).size !== tasks.length) {
      throw new BusinessRuleError("Each template task needs a different sort order");
    }
    const row = await prisma.tnaTemplate.create({
      data: { companyId: user.companyId, name: data.name, tasks: { create: tasks } },
      include: { tasks: true },
    });
    await this.audit({ user, action: "CREATE", entity: "TnaTemplate", entityId: row.id, after: row });
    return row;
  }

  async listTemplates() {
    const user = await this.guard("tna.view");
    return prisma.tnaTemplate.findMany({
      where: await listFilter(user),
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  // ---------- Plan ----------

  // শিপমেন্টের তারিখ থেকে পেছনে গুনে সব milestone-এর তারিখ বসায়
  async generatePlan(input: unknown) {
    const user = await this.guard("tna.create");
    const data = planSchema.parse(input);

    const tpl = found(
      await prisma.tnaTemplate.findUnique({
        where: { id: data.templateId },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
      }),
      "Template"
    );
    if (tpl.companyId !== user.companyId) throw new BusinessRuleError("Template not found");
    const style = found(await prisma.style.findUnique({ where: { id: data.styleId } }), "Style");
    if (style.companyId !== user.companyId) throw new BusinessRuleError("Style not found");

    let shipDate = data.shipDate;
    if (data.orderId) {
      const order = found(await prisma.order.findUnique({ where: { id: data.orderId } }), "Order");
      if (order.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
      shipDate = shipDate ?? order.shipDate ?? undefined;
    }
    if (!shipDate) throw new BusinessRuleError("Ship date is required");

    const built = buildTnaTasks(
      shipDate,
      tpl.tasks.map((t) => ({ name: t.name, daysBefore: t.daysBefore, sortOrder: t.sortOrder }))
    );

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.tnaPlan.create({
        data: {
          companyId: user.companyId,
          styleId: data.styleId,
          orderId: data.orderId,
          templateId: tpl.id,
          shipDate,
        },
      });
      const idBySort = new Map<number, string>();
      for (const t of built) {
        const row = await tx.tnaTask.create({
          data: { planId: p.id, name: t.name, plannedDate: t.plannedDate, sortOrder: t.sortOrder },
        });
        idBySort.set(t.sortOrder, row.id);
      }
      // নির্ভরতা (কোন কাজ শেষ না হলে এটা শুরু হবে না)
      for (const t of tpl.tasks) {
        if (t.dependsOnSortOrder === null) continue;
        const id = idBySort.get(t.sortOrder);
        const dep = idBySort.get(t.dependsOnSortOrder);
        if (id && dep) await tx.tnaTask.update({ where: { id }, data: { dependsOnId: dep } });
      }
      return p;
    });
    await this.audit({ user, action: "CREATE", entity: "TnaPlan", entityId: plan.id, after: plan });
    return plan;
  }

  async getPlan(id: string) {
    const user = await this.guard("tna.view");
    await this.loadPlan(user, id);
    return prisma.tnaPlan.findUnique({
      where: { id },
      include: {
        style: { select: { styleNo: true, name: true } },
        tasks: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async listPlans(filter: { styleId?: string; orderId?: string } = {}) {
    const user = await this.guard("tna.view");
    return prisma.tnaPlan.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.styleId ? { styleId: filter.styleId } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      include: {
        style: { select: { styleNo: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------- Milestone বদল ----------

  async updateTask(taskId: string, input: unknown) {
    const user = await this.guard("tna.edit");
    const patch = taskPatchSchema.parse(input);
    const task = found(await prisma.tnaTask.findUnique({ where: { id: taskId } }), "Task");
    await this.loadPlan(user, task.planId);

    const data: Record<string, unknown> = {};
    if (patch.ownerId !== undefined) data.ownerId = patch.ownerId;
    if (patch.departmentId !== undefined) data.departmentId = patch.departmentId;
    if (patch.delayReason !== undefined) data.delayReason = patch.delayReason;

    // তারিখ পিছালে কারণ লাগবে
    if (patch.revisedDate !== undefined) {
      const reason = patch.delayReason ?? task.delayReason;
      if (!reason || reason.trim().length < 3) {
        throw new BusinessRuleError("Delay reason is required when the date is revised");
      }
      data.revisedDate = patch.revisedDate;
    }

    if (patch.status !== undefined) {
      const to = patch.status;
      if (to === "COMPLETED") {
        if (task.dependsOnId) {
          const dep = await prisma.tnaTask.findUnique({ where: { id: task.dependsOnId } });
          if (dep && !isClosed(dep.status)) {
            throw new BusinessRuleError(`Finish "${dep.name}" first`);
          }
        }
        const actual = patch.actualDate ?? new Date();
        data.actualDate = actual;
        data.delayDays = calcDelayDays(task.plannedDate, actual);
      }
      if (to === "WAIVED") {
        data.approvedById = user.id; // ছাড় দিলে কে দিল তা থাকে
        data.approvedAt = new Date();
      }
      data.status = to;
    } else if (patch.actualDate !== undefined) {
      data.actualDate = patch.actualDate;
    }

    const row = await prisma.tnaTask.update({ where: { id: taskId }, data });
    await this.audit({
      user, action: "UPDATE", entity: "TnaTask", entityId: taskId, before: task, after: row,
      reason: patch.delayReason,
    });
    return row;
  }

  // স্বয়ংক্রিয় নিয়ম (সেকশন ১১):
  //  - তারিখ পেরোলে DELAYED
  //  - তারিখ কাছে আর আগের কাজ বাকি থাকলে AT_RISK
  //  - দেরির কারণে শিপমেন্টের তারিখ ছাড়ালে shipmentRisk = true
  // পরে Background job (ধাপ ড) এটা প্রতিদিন চালাবে।
  async refreshStatuses(planId: string) {
    const user = await this.guard("tna.edit");
    const plan = await this.loadPlan(user, planId);
    const tasks = await prisma.tnaTask.findMany({ where: { planId }, orderBy: { sortOrder: "asc" } });
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const today = startOfDay(new Date());

    let delayed = 0;
    let atRisk = 0;
    let shipmentRisk = false;

    for (const t of tasks) {
      if (isClosed(t.status)) continue;
      const due = startOfDay(t.revisedDate ?? t.plannedDate);
      const pred = t.dependsOnId ? byId.get(t.dependsOnId) : undefined;
      const predOpen = !!pred && !isClosed(pred.status);

      let status: TnaTaskStatus = t.status;
      let delay = t.delayDays;
      if (due < today) {
        status = "DELAYED";
        delay = calcDelayDays(due, today);
        delayed++;
      } else if (predOpen && daysBetween(today, due) <= RISK_WINDOW_DAYS) {
        status = "AT_RISK";
        atRisk++;
      } else if (t.status === "AT_RISK" || t.status === "DELAYED") {
        status = "ON_TRACK";
      }

      if (due > startOfDay(plan.shipDate)) shipmentRisk = true;

      if (status !== t.status || delay !== t.delayDays) {
        await prisma.tnaTask.update({ where: { id: t.id }, data: { status, delayDays: delay } });
        if (status === "DELAYED" && t.status !== "DELAYED" && t.ownerId) {
          await notify({
            companyId: plan.companyId,
            recipientId: t.ownerId,
            type: "TNA_OVERDUE",
            title: "T&A task overdue",
            message: `${t.name} is ${delay} day(s) late`,
            href: `/tna/${plan.id}`,
            entityType: "TnaTask",
            entityId: t.id,
          });
        }
      }
    }
    const last = tasks[tasks.length - 1];
    if (last && !isClosed(last.status) && startOfDay(last.revisedDate ?? last.plannedDate) < today) {
      shipmentRisk = true;
    }
    return { planId, delayed, atRisk, shipmentRisk };
  }
}

export const tnaService = new TnaService();