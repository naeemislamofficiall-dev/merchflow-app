import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { REPORTS } from "@/app/(app)/analytics/reports";
import { BusinessRuleError } from "@/lib/business-rules";
import { CSV_BOM, exportFileName, toCsv } from "@/lib/report-export";
import { buildXlsx } from "@/lib/report-excel";
import { errorMessage } from "@/lib/job-result";
import { isDue, isValidTimeOfDay, reportRange } from "@/lib/schedule-calc";
import { sendMail } from "@/lib/mailer";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { runAsUser, type SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  reportKey: z.string().refine((k) => REPORTS.some((r) => r.key === k), "Unknown report"),
  format: z.enum(["CSV", "XLSX"]),
  recipients: z
    .string()
    .transform((s) => s.split(/[,;\s]+/).filter(Boolean))
    .pipe(z.array(z.email()).min(1).max(20)),
  timeOfDay: z.string().refine(isValidTimeOfDay, "Time must be HH:mm (24 hour)"),
  rangeDays: z.number().int().min(1).max(365).optional(),
});

type Sched = {
  id: string;
  companyId: string;
  name: string;
  reportKey: string;
  format: "CSV" | "XLSX";
  recipients: string[];
  rangeDays: number | null;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Report build + email. Run-now-e session user-er scope-e chole.
async function deliver(sr: Sched) {
  try {
    const def = REPORTS.find((r) => r.key === sr.reportKey);
    if (!def) throw new Error(`Unknown report: ${sr.reportKey}`);
    const company = await prisma.company.findUnique({ where: { id: sr.companyId }, select: { timeZone: true } });
    const range = def.ranged ? reportRange(sr.rangeDays, new Date(), company?.timeZone ?? "Asia/Dhaka") : {};
    const result = await def.run(range);
    const fmt = sr.format === "CSV" ? "csv" : "xlsx";
    const content =
      fmt === "csv"
        ? CSV_BOM + toCsv(result.columns, result.rows)
        : await buildXlsx({ title: def.title, columns: result.columns, rows: result.rows, summary: result.summary });
    await sendMail({
      to: sr.recipients,
      subject: `${sr.name} (${def.title})`,
      html: `<p>${esc(sr.name)}: ${esc(def.title)} is attached (${result.rows.length} rows).</p>${
        result.summary ? `<p>${esc(result.summary)}</p>` : ""
      }`,
      attachments: [{ filename: exportFileName(def.key, fmt), content }],
    });
    await prisma.scheduledReport.update({
      where: { id: sr.id },
      data: { lastRunAt: new Date(), lastStatus: "SENT" },
    });
  } catch (err) {
    await prisma.scheduledReport.update({
      where: { id: sr.id },
      data: { lastStatus: `FAILED: ${errorMessage(err, 200)}` },
    });
    throw err;
  }
}

// Cron-e session nai: schedule-er creator-er permission ar scope diye chalay (shob-permission na)
async function deliverAsCreator(sr: Sched & { createdById: string | null }) {
  if (!sr.createdById) throw new Error("Schedule has no creator");
  const u = await prisma.user.findUnique({
    where: { id: sr.createdById },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!u || u.status !== "ACTIVE") throw new Error("Schedule creator is missing or inactive");
  const user: SessionUser = {
    id: u.id,
    email: u.email,
    companyId: sr.companyId,
    roleId: u.roleId,
    permissions: u.role.permissions.map((rp) => rp.permission.key),
  };
  return runAsUser(user, () => deliver(sr));
}

// Cron job entry (session nai, tai cron-e report run-er impersonation lagbe; failure JobRun-e dekha jay)
export async function runDueScheduledReports(): Promise<Record<string, number>> {
  const now = new Date();
  const list = await prisma.scheduledReport.findMany({
    where: { isActive: true },
    include: { company: { select: { timeZone: true } } },
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errs: string[] = [];
  for (const sr of list) {
    if (!isDue({ timeOfDay: sr.timeOfDay, now, lastRunAt: sr.lastRunAt, timeZone: sr.company.timeZone })) {
      skipped++;
      continue;
    }
    try {
      await deliverAsCreator(sr);
      sent++;
    } catch (e) {
      failed++;
      errs.push(`${sr.name}: ${errorMessage(e, 200)}`);
    }
  }
  if (failed > 0) throw new Error(`${failed} scheduled report(s) failed. ${errs.join(" | ")}`);
  return { sent, skipped };
}

class ScheduledReportService extends BaseService {
  async list() {
    const user = await this.guard("reportschedule.view");
    return prisma.scheduledReport.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("reportschedule.manage");
    const d = createSchema.parse(input);
    const row = await prisma.scheduledReport.create({
      data: {
        companyId: user.companyId,
        name: d.name,
        reportKey: d.reportKey,
        format: d.format,
        recipients: d.recipients,
        timeOfDay: d.timeOfDay,
        rangeDays: d.rangeDays ?? null,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "ScheduledReport", entityId: row.id, after: row });
    return { id: row.id };
  }

  private async load(user: SessionUser, id: string) {
    const sr = found(await prisma.scheduledReport.findUnique({ where: { id } }), "Scheduled report");
    await assertRecordInScope(user, sr.companyId);
    return sr;
  }

  async toggle(id: string) {
    const user = await this.guard("reportschedule.manage");
    const sr = await this.load(user, id);
    const row = await prisma.scheduledReport.update({ where: { id }, data: { isActive: !sr.isActive } });
    await this.audit({
      user, action: "UPDATE", entity: "ScheduledReport", entityId: id,
      before: { isActive: sr.isActive }, after: { isActive: row.isActive },
    });
    return { id };
  }

  async remove(id: string) {
    const user = await this.guard("reportschedule.manage");
    const sr = await this.load(user, id);
    await prisma.scheduledReport.delete({ where: { id } });
    await this.audit({ user, action: "DELETE", entity: "ScheduledReport", entityId: id, before: sr });
    return { id };
  }

  // Ekta report, ekhoni. Session user-er scope-e chole.
  async runNow(id: string) {
    const user = await this.guard("reportschedule.manage");
    const sr = await this.load(user, id);
    if (sr.recipients.length === 0) throw new BusinessRuleError("This schedule has no recipients");
    await deliver(sr);
    await this.audit({
      user, action: "CREATE", entity: "ScheduledReportRun", entityId: id,
      after: { reportKey: sr.reportKey, recipients: sr.recipients },
    });
    return { id };
  }
}

export const scheduledReportService = new ScheduledReportService();