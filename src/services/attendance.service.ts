import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertFactoryInScope } from "@/lib/scope";
import { startOfDay } from "@/lib/service-helpers";
import { dateOnly } from "@/lib/payroll-calc";
import { can } from "@/lib/permissions";
import { BaseService } from "./base.service";

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE", "HOLIDAY", "WEEKEND"] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const saveSchema = z.object({
  factoryId: z.string().min(1),
  date: dateStr,
  rows: z.array(
    z.object({
      employeeId: z.string().min(1),
      status: z.enum(ATTENDANCE_STATUSES).or(z.literal("")),
      overtimeHours: z.coerce.number().min(0).max(16).default(0),
    })
  ),
});

class AttendanceService extends BaseService {
  async factoryOptions() {
    const user = await this.guard("attendance.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.factory.findMany({
      where: { id: { in: scope.factoryIds }, companyId: user.companyId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
    return rows.map((f) => ({ value: f.id, label: `${f.code} - ${f.name}` }));
  }

  // একটা কারখানার একদিনের হাজিরা-শিট
  async sheet(factoryId: string, date: string) {
    const user = await this.guard("attendance.view");
    dateStr.parse(date);
    assertFactoryInScope(await this.scopeOf(user), factoryId);
    const day = dateOnly(date);

    const employees = await prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        factoryId,
        status: "ACTIVE",
        joinDate: { lte: day },
      },
      orderBy: { employeeNo: "asc" },
    });
    const records = await prisma.attendanceRecord.findMany({
      where: { companyId: user.companyId, date: day, employeeId: { in: employees.map((e) => e.id) } },
    });
    const rec = new Map(records.map((r) => [r.employeeId, r]));
    return {
      canRecord: can(user, "attendance.record"),
      rows: employees.map((e) => {
        const r = rec.get(e.id);
        return {
          employeeId: e.id,
          employeeNo: e.employeeNo,
          fullName: e.fullName,
          status: r?.status ?? "",
          overtimeHours: r ? String(Math.round((r.overtimeMinutes / 60) * 100) / 100) : "",
        };
      }),
    };
  }

  async save(input: unknown) {
    const user = await this.guard("attendance.record");
    const d = saveSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), d.factoryId);
    const day = dateOnly(d.date);
    if (day > startOfDay(new Date())) throw new BusinessRuleError("You cannot record attendance for a future date");

    const ids = d.rows.map((r) => r.employeeId);
    const valid = await prisma.employee.findMany({
      where: { id: { in: ids }, companyId: user.companyId, factoryId: d.factoryId },
      select: { id: true },
    });
    const ok = new Set(valid.map((v) => v.id));
    if (ids.some((x) => !ok.has(x))) throw new BusinessRuleError("An employee does not belong to this factory");

    const todo = d.rows.filter((r) => r.status !== "");
    await prisma.$transaction(
      todo.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: r.employeeId, date: day } },
          create: {
            companyId: user.companyId,
            employeeId: r.employeeId,
            date: day,
            status: r.status as (typeof ATTENDANCE_STATUSES)[number],
            overtimeMinutes: Math.round(r.overtimeHours * 60),
            recordedById: user.id,
          },
          update: {
            status: r.status as (typeof ATTENDANCE_STATUSES)[number],
            overtimeMinutes: Math.round(r.overtimeHours * 60),
            recordedById: user.id,
          },
        })
      )
    );
    await this.audit({
      user, action: "UPDATE", entity: "Attendance", entityId: `${d.factoryId}:${d.date}`,
      after: { recorded: todo.length },
    });
    return { saved: todo.length };
  }
}

export const attendanceService = new AttendanceService();
