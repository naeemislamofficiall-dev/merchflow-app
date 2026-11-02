import { prisma } from "@/lib/prisma";
import { classifyTask, delayDays, effectiveDate, type RiskLevel } from "@/lib/tna-risk";
import { BaseService } from "./base.service";

const OPEN = ["NOT_STARTED", "ON_TRACK", "AT_RISK", "DELAYED"] as const;

class TnaViewService extends BaseService {
  async calendar(start: Date, end: Date) {
    const user = await this.guard("tna.view");
    const tasks = await prisma.tnaTask.findMany({
      where: {
        plan: { companyId: user.companyId },
        OR: [
          { revisedDate: { gte: start, lt: end } },
          { revisedDate: null, plannedDate: { gte: start, lt: end } },
        ],
      },
      include: {
        plan: { select: { id: true, shipDate: true, style: { select: { styleNo: true } }, order: { select: { orderNo: true } } } },
        dependsOn: { select: { status: true } },
      },
      orderBy: { plannedDate: "asc" },
      take: 500,
    });
    return tasks.map((t) => ({
      id: t.id,
      planId: t.plan.id,
      name: t.name,
      date: effectiveDate(t),
      status: t.status,
      style: t.plan.style.styleNo,
      order: t.plan.order?.orderNo ?? null,
      risk: classifyTask({ ...t, dependsOnStatus: t.dependsOn?.status ?? null }, t.plan.shipDate),
    }));
  }

  // Shob khola task-er risk. OK gulo bad.
  async risk() {
    const user = await this.guard("tna.view");
    const tasks = await prisma.tnaTask.findMany({
      where: { plan: { companyId: user.companyId }, status: { in: [...OPEN] } },
      include: {
        plan: { select: { id: true, shipDate: true, style: { select: { styleNo: true } }, order: { select: { orderNo: true } } } },
        dependsOn: { select: { name: true, status: true } },
      },
      take: 2000,
    });
    const rows = tasks
      .map((t) => {
        const level: RiskLevel = classifyTask({ ...t, dependsOnStatus: t.dependsOn?.status ?? null }, t.plan.shipDate);
        return {
          id: t.id,
          planId: t.plan.id,
          name: t.name,
          due: effectiveDate(t),
          level,
          lateDays: delayDays(t),
          style: t.plan.style.styleNo,
          order: t.plan.order?.orderNo ?? null,
          shipDate: t.plan.shipDate,
          waitingFor: t.dependsOn && t.dependsOn.status !== "COMPLETED" ? t.dependsOn.name : null,
        };
      })
      .filter((r) => r.level !== "OK");
    const weight: Record<RiskLevel, number> = { SHIPMENT_RISK: 0, OVERDUE: 1, AT_RISK: 2, OK: 3 };
    return rows.sort((a, b) => weight[a.level] - weight[b.level] || b.lateDays - a.lateDays);
  }

  async sampleCalendar(start: Date, end: Date) {
    const user = await this.guard("sample.view");
    const rows = await prisma.sampleRequest.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { dueDate: { gte: start, lt: end } },
          { dueDate: null, plannedCompletion: { gte: start, lt: end } },
        ],
      },
      include: { style: { select: { styleNo: true } } },
      orderBy: { dueDate: "asc" },
      take: 500,
    });
    return rows.map((r) => ({
      id: r.id,
      sampleNo: r.sampleNo,
      type: r.sampleType,
      style: r.style.styleNo,
      status: r.status,
      date: (r.dueDate ?? r.plannedCompletion) as Date,
    }));
  }
}

export const tnaViewService = new TnaViewService();
