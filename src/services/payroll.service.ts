import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { assertFactoryInScope } from "@/lib/scope";
import { computePay, daysInMonth } from "@/lib/payroll-calc";
import { monthRange } from "@/lib/budget-calc";
import { round2 } from "@/lib/finance-calc";
import { can } from "@/lib/permissions";
import { BaseService } from "./base.service";

const generateSchema = z.object({
  factoryId: z.string().min(1, "Select a factory"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

class PayrollService extends BaseService {
  async factoryOptions() {
    const user = await this.guard("payroll.generate");
    const scope = await this.scopeOf(user);
    const rows = await prisma.factory.findMany({
      where: { id: { in: scope.factoryIds }, companyId: user.companyId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
    return rows.map((f) => ({ value: f.id, label: `${f.code} - ${f.name}` }));
  }

  async list() {
    const user = await this.guard("payroll.view");
    const scope = await this.scopeOf(user);
    const runs = await prisma.payrollRun.findMany({
      where: { companyId: user.companyId, factoryId: { in: scope.factoryIds } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 120,
    });
    const fac = await prisma.factory.findMany({ where: { id: { in: scope.factoryIds } }, select: { id: true, code: true } });
    const fn = new Map(fac.map((f) => [f.id, f.code]));
    return {
      canGenerate: can(user, "payroll.generate"),
      rows: runs.map((r) => ({
        id: r.id,
        factory: fn.get(r.factoryId) ?? "-",
        period: `${r.year}-${String(r.month).padStart(2, "0")}`,
        status: r.status,
        employeeCount: r.employeeCount,
        totalGross: Number(r.totalGross),
        totalDeduction: Number(r.totalDeduction),
        totalNet: Number(r.totalNet),
      })),
    };
  }

  private async load(id: string) {
    const user = await this.guard("payroll.view");
    const run = found(await prisma.payrollRun.findUnique({ where: { id } }), "Payroll run");
    await assertRecordInScope(user, run.companyId);
    assertFactoryInScope(await this.scopeOf(user), run.factoryId);
    return { user, run };
  }

  async get(id: string) {
    const { user, run } = await this.load(id);
    const lines = await prisma.payrollLine.findMany({
      where: { runId: id },
      include: { employee: { select: { employeeNo: true, fullName: true } } },
    });
    const fac = await prisma.factory.findUnique({ where: { id: run.factoryId }, select: { code: true, name: true } });
    return {
      run,
      factory: fac ? `${fac.code} - ${fac.name}` : "-",
      canGenerate: can(user, "payroll.generate"),
      canApprove: can(user, "payroll.approve"),
      canPay: can(user, "payroll.pay"),
      lines: lines
        .map((l) => ({
          id: l.id,
          employeeNo: l.employee.employeeNo,
          fullName: l.employee.fullName,
          presentDays: Number(l.presentDays),
          absentDays: Number(l.absentDays),
          leaveDays: Number(l.leaveDays),
          overtimeHours: Number(l.overtimeHours),
          basic: Number(l.basic),
          allowance: Number(l.allowance),
          overtimePay: Number(l.overtimePay),
          deduction: Number(l.deduction),
          netPay: Number(l.netPay),
        }))
        .sort((a, b) => a.employeeNo.localeCompare(b.employeeNo)),
    };
  }

  // হাজিরা থেকে সবার বেতন হিসাব করে। Draft থাকলে আবার করা যায়
  async generate(input: unknown) {
    const user = await this.guard("payroll.generate");
    const d = generateSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), d.factoryId);
    const f = await prisma.factory.findUnique({ where: { id: d.factoryId }, select: { companyId: true } });
    if (!f || f.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");

    const { from, to } = monthRange(d.year, d.month);
    if (from > new Date()) throw new BusinessRuleError("You cannot run payroll for a future month");

    const existing = await prisma.payrollRun.findUnique({
      where: { companyId_factoryId_year_month: { companyId: user.companyId, factoryId: d.factoryId, year: d.year, month: d.month } },
    });
    if (existing && (existing.status === "APPROVED" || existing.status === "PAID")) {
      throw new BusinessRuleError("This month's payroll is already approved. Cancel it first to run again");
    }

    const employees = await prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        factoryId: d.factoryId,
        joinDate: { lt: to },
        OR: [{ exitDate: null }, { exitDate: { gte: from } }],
      },
    });
    if (employees.length === 0) throw new BusinessRuleError("No employees found for this factory and month");

    const records = await prisma.attendanceRecord.findMany({
      where: { companyId: user.companyId, employeeId: { in: employees.map((e) => e.id) }, date: { gte: from, lt: to } },
    });
    if (records.length === 0) throw new BusinessRuleError("No attendance is recorded for this month yet");

    const byEmp = new Map<string, typeof records>();
    for (const r of records) byEmp.set(r.employeeId, [...(byEmp.get(r.employeeId) ?? []), r]);

    const monthDays = daysInMonth(d.year, d.month);
    const lines = employees.map((e) => {
      const rs = byEmp.get(e.id) ?? [];
      const count = (s: string) => rs.filter((r) => r.status === s).length;
      const present = count("PRESENT") + count("LATE") + count("HALF_DAY") * 0.5;
      const absent = count("ABSENT") + count("HALF_DAY") * 0.5;
      const leave = count("LEAVE");
      const otHours = rs.reduce((s, r) => s + r.overtimeMinutes, 0) / 60;
      const pay = computePay({
        basic: Number(e.basicSalary),
        allowance: Number(e.allowance),
        overtimeRate: Number(e.overtimeRate),
        monthDays,
        absentDays: absent,
        overtimeHours: otHours,
      });
      return {
        employeeId: e.id,
        presentDays: present,
        absentDays: absent,
        leaveDays: leave,
        overtimeHours: round2(otHours),
        basic: Number(e.basicSalary),
        allowance: Number(e.allowance),
        overtimePay: pay.overtimePay,
        deduction: pay.deduction,
        netPay: pay.netPay,
        gross: pay.gross,
      };
    });
    const totalGross = round2(lines.reduce((s, l) => s + l.gross, 0));
    const totalDeduction = round2(lines.reduce((s, l) => s + l.deduction, 0));
    const totalNet = round2(lines.reduce((s, l) => s + l.netPay, 0));

    const run = await prisma.$transaction(async (tx) => {
      const header = {
        status: "DRAFT" as const,
        employeeCount: lines.length,
        totalGross,
        totalDeduction,
        totalNet,
        cancelReason: null,
        createdById: user.id,
      };
      const row = existing
        ? await tx.payrollRun.update({ where: { id: existing.id }, data: header })
        : await tx.payrollRun.create({
            data: { ...header, companyId: user.companyId, factoryId: d.factoryId, year: d.year, month: d.month },
          });
      await tx.payrollLine.deleteMany({ where: { runId: row.id } });
      await tx.payrollLine.createMany({
        data: lines.map((l) => ({
          runId: row.id,
          employeeId: l.employeeId,
          presentDays: l.presentDays,
          absentDays: l.absentDays,
          leaveDays: l.leaveDays,
          overtimeHours: l.overtimeHours,
          basic: l.basic,
          allowance: l.allowance,
          overtimePay: l.overtimePay,
          deduction: l.deduction,
          netPay: l.netPay,
        })),
      });
      return row;
    });
    await this.audit({
      user, action: existing ? "UPDATE" : "CREATE", entity: "PayrollRun", entityId: run.id,
      after: { year: d.year, month: d.month, employees: lines.length, totalNet },
    });
    return run;
  }

  async approve(id: string) {
    const user = await this.guard("payroll.approve");
    const { run } = await this.load(id);
    if (run.status !== "DRAFT") throw new BusinessRuleError("Only a draft payroll can be approved");
    const row = await prisma.payrollRun.update({ where: { id }, data: { status: "APPROVED", approvedById: user.id } });
    await this.audit({ user, action: "UPDATE", entity: "PayrollRun", entityId: id, before: { status: run.status }, after: { status: row.status } });
    return row;
  }

  async markPaid(id: string) {
    const user = await this.guard("payroll.pay");
    const { run } = await this.load(id);
    if (run.status !== "APPROVED") throw new BusinessRuleError("Only an approved payroll can be marked as paid");
    const row = await prisma.payrollRun.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
    await this.audit({ user, action: "UPDATE", entity: "PayrollRun", entityId: id, before: { status: run.status }, after: { status: row.status } });
    return row;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("payroll.approve");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const { run } = await this.load(id);
    if (run.status !== "DRAFT" && run.status !== "APPROVED") throw new BusinessRuleError("This payroll cannot be cancelled");
    const row = await prisma.payrollRun.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason.trim() } });
    await this.audit({ user, action: "UPDATE", entity: "PayrollRun", entityId: id, before: { status: run.status }, after: { status: row.status }, reason: reason.trim() });
    return row;
  }
}

export const payrollService = new PayrollService();
