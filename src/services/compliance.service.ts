import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter, startOfDay } from "@/lib/service-helpers";
import { assertFactoryInScope } from "@/lib/scope";
import { nextAuditNo } from "@/lib/numbering-extra";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

export type CertState = "VALID" | "EXPIRING" | "EXPIRED" | "REVOKED";

const upper = (s: string) => s.toUpperCase();

const typeSchema = z.object({
  code: z.string().trim().min(2, "Code is too short").max(20).transform(upper),
  name: z.string().trim().min(2, "Name is too short").max(100),
});

const certTypeSchema = typeSchema.extend({
  validityMonths: z.coerce.number().int().positive().max(240).optional(),
  alertDays: z.coerce.number().int().min(0).max(365).default(60),
});

const certSchema = z.object({
  typeId: z.string().min(1, "Select a certificate type"),
  factoryId: z.string().optional(),
  certificateNo: z.string().trim().min(1, "Certificate number is required").max(60),
  issuer: z.string().trim().min(2, "Issuer is required").max(120),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date().optional(),
  remarks: z.string().max(300).optional(),
});

const auditSchema = z.object({
  typeId: z.string().min(1, "Select an audit type"),
  factoryId: z.string().optional(),
  auditorName: z.string().trim().min(2, "Auditor is required").max(120),
  plannedDate: z.coerce.date(),
});

const completeSchema = z.object({
  result: z.enum(["PASS", "CONDITIONAL", "FAIL"]),
  score: z.coerce.number().min(0).max(100).optional(),
  completedDate: z.coerce.date().optional(),
  findings: z.string().max(2000).optional(),
  nextAuditDate: z.coerce.date().optional(),
});

function daysLeft(expiry: Date, today: Date) {
  return Math.round((startOfDay(expiry).getTime() - today.getTime()) / 86_400_000);
}

function stateOf(status: string, left: number, alertDays: number): CertState {
  if (status === "REVOKED") return "REVOKED";
  if (left < 0) return "EXPIRED";
  if (left <= alertDays) return "EXPIRING";
  return "VALID";
}

class ComplianceService extends BaseService {
  // ---------- ধরন (configurable) ----------

  async listCertificateTypes() {
    const user = await this.guard("compliance.view");
    return prisma.certificateType.findMany({ where: { companyId: user.companyId }, orderBy: { code: "asc" } });
  }

  async createCertificateType(input: unknown) {
    const user = await this.guard("compliance.manage");
    const d = certTypeSchema.parse(input);
    const dup = await prisma.certificateType.findUnique({ where: { companyId_code: { companyId: user.companyId, code: d.code } } });
    if (dup) throw new BusinessRuleError("This code is already used");
    const row = await prisma.certificateType.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "CertificateType", entityId: row.id, after: row });
    return row;
  }

  async toggleCertificateType(id: string) {
    const user = await this.guard("compliance.manage");
    const row = found(await prisma.certificateType.findUnique({ where: { id } }), "Certificate type");
    await assertRecordInScope(user, row.companyId);
    const updated = await prisma.certificateType.update({ where: { id }, data: { isActive: !row.isActive } });
    await this.audit({ user, action: "UPDATE", entity: "CertificateType", entityId: id, before: { isActive: row.isActive }, after: { isActive: updated.isActive } });
    return updated;
  }

  async listAuditTypes() {
    const user = await this.guard("compliance.view");
    return prisma.complianceAuditType.findMany({ where: { companyId: user.companyId }, orderBy: { code: "asc" } });
  }

  async createAuditType(input: unknown) {
    const user = await this.guard("compliance.manage");
    const d = typeSchema.parse(input);
    const dup = await prisma.complianceAuditType.findUnique({ where: { companyId_code: { companyId: user.companyId, code: d.code } } });
    if (dup) throw new BusinessRuleError("This code is already used");
    const row = await prisma.complianceAuditType.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "ComplianceAuditType", entityId: row.id, after: row });
    return row;
  }

  async toggleAuditType(id: string) {
    const user = await this.guard("compliance.manage");
    const row = found(await prisma.complianceAuditType.findUnique({ where: { id } }), "Audit type");
    await assertRecordInScope(user, row.companyId);
    const updated = await prisma.complianceAuditType.update({ where: { id }, data: { isActive: !row.isActive } });
    await this.audit({ user, action: "UPDATE", entity: "ComplianceAuditType", entityId: id, before: { isActive: row.isActive }, after: { isActive: updated.isActive } });
    return updated;
  }

  // ফর্মের ড্রপডাউন
  async formOptions() {
    const user = await this.guard("compliance.manage");
    const scope = await this.scopeOf(user);
    const [factories, certTypes, auditTypes] = await Promise.all([
      prisma.factory.findMany({
        where: { id: { in: scope.factoryIds }, companyId: user.companyId },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.certificateType.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { code: "asc" } }),
      prisma.complianceAuditType.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { code: "asc" } }),
    ]);
    return {
      factories: factories.map((f) => ({ value: f.id, label: `${f.code} - ${f.name}` })),
      certTypes: certTypes.map((t) => ({ value: t.id, label: `${t.code} - ${t.name}` })),
      auditTypes: auditTypes.map((t) => ({ value: t.id, label: `${t.code} - ${t.name}` })),
    };
  }

  private async factoryNames(ids: (string | null)[]) {
    const real = [...new Set(ids.filter((x): x is string => !!x))];
    const rows = await prisma.factory.findMany({ where: { id: { in: real } }, select: { id: true, code: true } });
    return new Map(rows.map((f) => [f.id, f.code]));
  }

  private async checkFactory(user: SessionUser, factoryId?: string) {
    if (!factoryId) return;
    assertFactoryInScope(await this.scopeOf(user), factoryId);
    const f = await prisma.factory.findUnique({ where: { id: factoryId }, select: { companyId: true } });
    if (!f || f.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
  }

  // ---------- সার্টিফিকেট ----------

  async createCertificate(input: unknown) {
    const user = await this.guard("compliance.manage");
    const d = certSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const type = found(await prisma.certificateType.findUnique({ where: { id: d.typeId } }), "Certificate type");
    if (type.companyId !== user.companyId || !type.isActive) throw new BusinessRuleError("Certificate type not available");

    let expiry = d.expiryDate;
    if (!expiry && type.validityMonths) {
      expiry = new Date(Date.UTC(d.issueDate.getUTCFullYear(), d.issueDate.getUTCMonth() + type.validityMonths, d.issueDate.getUTCDate()));
    }
    if (!expiry) throw new BusinessRuleError("Enter the expiry date");
    if (expiry <= d.issueDate) throw new BusinessRuleError("Expiry date must be after the issue date");

    const row = await prisma.certificate.create({
      data: {
        companyId: user.companyId,
        factoryId: d.factoryId,
        typeId: d.typeId,
        certificateNo: d.certificateNo,
        issuer: d.issuer,
        issueDate: d.issueDate,
        expiryDate: expiry,
        remarks: d.remarks,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "Certificate", entityId: row.id, after: row });
    return row;
  }

  async listCertificates() {
    const user = await this.guard("compliance.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.certificate.findMany({
      where: {
        ...(await listFilter(user)),
        OR: [{ factoryId: null }, { factoryId: { in: scope.factoryIds } }],
      },
      include: { type: { select: { code: true, name: true, alertDays: true } } },
      orderBy: { expiryDate: "asc" },
      take: 500,
    });
    const fac = await this.factoryNames(rows.map((r) => r.factoryId));
    const today = startOfDay(new Date());
    return rows.map((r) => {
      const left = daysLeft(r.expiryDate, today);
      return {
        id: r.id,
        typeName: `${r.type.code} - ${r.type.name}`,
        certificateNo: r.certificateNo,
        issuer: r.issuer,
        factory: r.factoryId ? (fac.get(r.factoryId) ?? "-") : "All",
        issueDate: r.issueDate,
        expiryDate: r.expiryDate,
        daysLeft: left,
        state: stateOf(r.status, left, r.type.alertDays),
        status: r.status,
      };
    });
  }

  async revokeCertificate(id: string, reason: string) {
    const user = await this.guard("compliance.manage");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const row = found(await prisma.certificate.findUnique({ where: { id } }), "Certificate");
    await assertRecordInScope(user, row.companyId);
    if (row.status !== "ACTIVE") throw new BusinessRuleError("This certificate is already revoked");
    const updated = await prisma.certificate.update({ where: { id }, data: { status: "REVOKED", revokeReason: reason.trim() } });
    await this.audit({ user, action: "UPDATE", entity: "Certificate", entityId: id, before: { status: row.status }, after: { status: updated.status }, reason: reason.trim() });
    return updated;
  }

  // alert.service থেকে ডাকা হয় (সেখানে alert.view আগেই যাচাই হয়েছে)
  async expiryAlertRows(user: SessionUser) {
    const scope = await this.scopeOf(user);
    const today = startOfDay(new Date());
    const horizon = new Date(today.getTime() + 365 * 86_400_000);
    const rows = await prisma.certificate.findMany({
      where: {
        ...(await listFilter(user)),
        status: "ACTIVE",
        expiryDate: { lte: horizon },
        OR: [{ factoryId: null }, { factoryId: { in: scope.factoryIds } }],
      },
      include: { type: { select: { name: true, alertDays: true } } },
    });
    const out: {
      id: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM";
      category: string;
      title: string;
      message: string;
      href: string;
      entityType: string;
      entityId: string;
      since: Date;
    }[] = [];
    for (const r of rows) {
      const left = daysLeft(r.expiryDate, today);
      if (left > r.type.alertDays) continue;
      out.push({
        id: `cert:${r.id}`,
        severity: left < 0 ? "CRITICAL" : left <= 15 ? "HIGH" : "MEDIUM",
        category: "Compliance",
        title: left < 0 ? "Certificate expired" : "Certificate expiring",
        message:
          left < 0
            ? `${r.type.name} (${r.certificateNo}) expired ${-left} day(s) ago`
            : `${r.type.name} (${r.certificateNo}) expires in ${left} day(s)`,
        href: "/compliance/certificates",
        entityType: "Certificate",
        entityId: r.id,
        since: r.expiryDate,
      });
    }
    return out;
  }

  // ---------- অডিট ----------

  async createAudit(input: unknown) {
    const user = await this.guard("compliance.manage");
    const d = auditSchema.parse(input);
    await this.checkFactory(user, d.factoryId);
    const type = found(await prisma.complianceAuditType.findUnique({ where: { id: d.typeId } }), "Audit type");
    if (type.companyId !== user.companyId || !type.isActive) throw new BusinessRuleError("Audit type not available");
    const row = await prisma.complianceAudit.create({
      data: {
        companyId: user.companyId,
        auditNo: await nextAuditNo(user.companyId),
        factoryId: d.factoryId,
        typeId: d.typeId,
        auditorName: d.auditorName,
        plannedDate: d.plannedDate,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "ComplianceAudit", entityId: row.id, after: row });
    return row;
  }

  async listAudits() {
    const user = await this.guard("compliance.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.complianceAudit.findMany({
      where: {
        ...(await listFilter(user)),
        OR: [{ factoryId: null }, { factoryId: { in: scope.factoryIds } }],
      },
      include: { type: { select: { code: true, name: true } } },
      orderBy: { plannedDate: "desc" },
      take: 300,
    });
    const fac = await this.factoryNames(rows.map((r) => r.factoryId));
    return rows.map((r) => ({
      id: r.id,
      auditNo: r.auditNo,
      typeName: `${r.type.code} - ${r.type.name}`,
      auditorName: r.auditorName,
      factory: r.factoryId ? (fac.get(r.factoryId) ?? "-") : "All",
      plannedDate: r.plannedDate,
      status: r.status,
      result: r.result,
    }));
  }

  async getAudit(id: string) {
    const user = await this.guard("compliance.view");
    const row = found(await prisma.complianceAudit.findUnique({ where: { id }, include: { type: true } }), "Audit");
    await assertRecordInScope(user, row.companyId);
    if (row.factoryId) assertFactoryInScope(await this.scopeOf(user), row.factoryId);
    return row;
  }

  async completeAudit(id: string, input: unknown) {
    const user = await this.guard("compliance.manage");
    const d = completeSchema.parse(input);
    const row = await this.getAudit(id);
    if (row.status !== "PLANNED") throw new BusinessRuleError("Only a planned audit can be completed");
    const completedDate = d.completedDate ?? new Date();
    if (d.nextAuditDate && d.nextAuditDate <= completedDate) throw new BusinessRuleError("Next audit date must be after the completed date");
    const updated = await prisma.complianceAudit.update({
      where: { id },
      data: {
        status: "COMPLETED",
        result: d.result,
        score: d.score,
        findings: d.findings,
        completedDate,
        nextAuditDate: d.nextAuditDate,
      },
    });
    await this.audit({ user, action: "UPDATE", entity: "ComplianceAudit", entityId: id, before: { status: row.status }, after: { status: updated.status, result: d.result } });
    return updated;
  }

  async cancelAudit(id: string, reason: string) {
    const user = await this.guard("compliance.manage");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const row = await this.getAudit(id);
    if (row.status !== "PLANNED") throw new BusinessRuleError("Only a planned audit can be cancelled");
    const updated = await prisma.complianceAudit.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason.trim() } });
    await this.audit({ user, action: "UPDATE", entity: "ComplianceAudit", entityId: id, before: { status: row.status }, after: { status: updated.status }, reason: reason.trim() });
    return updated;
  }
}

export const complianceService = new ComplianceService();
