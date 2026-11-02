import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/service-helpers";
import { zonedParts } from "@/lib/schedule-calc";
import { elapsedMs, errorMessage, formatOutcome, type JobKey } from "@/lib/job-result";
import { notify } from "./notification.service";
import { runDueScheduledReports } from "./scheduled-report.service";

const OPEN_TNA = ["COMPLETED", "WAIVED"];

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function tnaOverdueAlerts() {
  const today = startOfDay(new Date());
  const tasks = await prisma.tnaTask.findMany({
    where: {
      ownerId: { not: null },
      status: { notIn: OPEN_TNA as never },
      plan: { OR: [{ orderId: null }, { order: { status: { in: ["DRAFT", "CONFIRMED", "IN_PRODUCTION"] } } }] },
    },
    include: {
      plan: { select: { id: true, companyId: true, style: { select: { styleNo: true } }, order: { select: { orderNo: true } } } },
    },
  });
  const already = await prisma.notification.findMany({
    where: { type: "TNA_OVERDUE", entityType: "TnaTask", createdAt: { gte: todayStart() } },
    select: { entityId: true },
  });
  const done = new Set(already.map((n) => n.entityId));
  let alerts = 0;
  let skipped = 0;
  for (const t of tasks) {
    const due = startOfDay(t.revisedDate ?? t.plannedDate);
    if (!t.ownerId || due >= today || done.has(t.id)) {
      skipped++;
      continue;
    }
    await notify({
      companyId: t.plan.companyId,
      recipientId: t.ownerId,
      type: "TNA_OVERDUE",
      title: "T&A task overdue",
      message: `${t.name} (${t.plan.order?.orderNo ?? t.plan.style.styleNo}) was due ${due.toISOString().slice(0, 10)}`,
      href: `/tna/${t.plan.id}`,
      entityType: "TnaTask",
      entityId: t.id,
    });
    alerts++;
  }
  return { alerts, skipped };
}

async function supplierLateReminders() {
  const today = startOfDay(new Date());
  const list = await prisma.poFollowUp.findMany({
    where: { actualReceiptDate: null, latestPromisedDate: { lt: today } },
    include: { po: { select: { id: true, poNo: true, companyId: true, createdById: true, supplier: { select: { name: true } } } } },
  });
  const already = await prisma.notification.findMany({
    where: { type: "SUPPLIER_LATE", entityType: "PoFollowUp", createdAt: { gte: todayStart() } },
    select: { entityId: true },
  });
  const done = new Set(already.map((n) => n.entityId));
  let reminders = 0;
  let skipped = 0;
  for (const f of list) {
    if (!f.po.createdById || done.has(f.id)) {
      skipped++;
      continue;
    }
    await notify({
      companyId: f.po.companyId,
      recipientId: f.po.createdById,
      type: "SUPPLIER_LATE",
      title: "Supplier late",
      message: `${f.po.supplier.name} is late on ${f.po.poNo} (promised ${f.latestPromisedDate.toISOString().slice(0, 10)})`,
      href: `/purchase-orders/${f.po.id}`,
      entityType: "PoFollowUp",
      entityId: f.id,
    });
    reminders++;
  }
  return { reminders, skipped };
}

async function dailyKpiSnapshot() {
  const companies = await prisma.company.findMany({ where: { status: "ACTIVE" }, select: { id: true, timeZone: true } });
  const today = startOfDay(new Date());
  for (const c of companies) {
    const snapshotDate = new Date(`${zonedParts(new Date(), c.timeZone).dateKey}T00:00:00Z`);
    const [byStatus, openPo, overdueTna] = await Promise.all([
      prisma.order.groupBy({ by: ["status"], where: { companyId: c.id }, _count: { _all: true } }),
      prisma.purchaseOrder.count({ where: { companyId: c.id, status: { in: ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"] } } }),
      prisma.tnaTask.count({
        where: { plan: { companyId: c.id }, status: { notIn: OPEN_TNA as never }, plannedDate: { lt: today } },
      }),
    ]);
    const metrics = {
      orders: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      openPurchaseOrders: openPo,
      overdueTnaTasks: overdueTna,
    };
    await prisma.kpiSnapshot.upsert({
      where: { companyId_snapshotDate: { companyId: c.id, snapshotDate } },
      update: { metrics },
      create: { companyId: c.id, snapshotDate, metrics },
    });
  }
  return { companies: companies.length };
}

const HANDLERS: Record<JobKey, () => Promise<Record<string, number>>> = {
  "tna-overdue-alerts": tnaOverdueAlerts,
  "supplier-late-reminders": supplierLateReminders,
  "daily-kpi-snapshot": dailyKpiSnapshot,
  "scheduled-reports": runDueScheduledReports,
};

export function queueRun(jobKey: JobKey, trigger: "CRON" | "MANUAL", triggeredById?: string) {
  return prisma.jobRun.create({ data: { jobKey, trigger, triggeredById, status: "QUEUED" } });
}

// Kokhono throw kore na: failure JobRun-e lekha hoy
export async function executeRun(id: string, key: JobKey) {
  const start = new Date();
  await prisma.jobRun.update({ where: { id }, data: { status: "RUNNING", startedAt: start } });
  try {
    const counts = await HANDLERS[key]();
    const end = new Date();
    await prisma.jobRun.update({
      where: { id },
      data: { status: "SUCCESS", finishedAt: end, durationMs: elapsedMs(start, end), summary: formatOutcome(counts) },
    });
  } catch (err) {
    const end = new Date();
    await prisma.jobRun.update({
      where: { id },
      data: { status: "FAILED", finishedAt: end, durationMs: elapsedMs(start, end), error: errorMessage(err) },
    });
  }
}