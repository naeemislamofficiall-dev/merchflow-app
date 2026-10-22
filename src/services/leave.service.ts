import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { assertFactoryInScope } from "@/lib/scope";
import { nextLeaveNo } from "@/lib/numbering-extra";
import { addDays, dayCount } from "@/lib/payroll-calc";
import { can } from "@/lib/permissions";
import { BaseService } from "./base.service";

const createSchema = z.object({
  employeeId: z.string().min(1, "Select an employee"),
  leaveTypeId: z.string().min(1, "Select a leave type"),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  reason: z.string().max(300).optional(),
});

const MAX_DAYS = 90;

class LeaveService extends BaseService {
  async formOptions() {
    const user = await this.guard("leave.request");
    const scope = await this.scopeOf(user);
    const [employees, types] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId: user.companyId, status: "ACTIVE", factoryId: { in: scope.factoryIds } },
        select: { id: true, employeeNo: true, fullName: true },
        orderBy: { employeeNo: "asc" },
      }),
      prisma.leaveType.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { code: "asc" } }),
    ]);
    return {
      employees: employees.map((e) => ({ value: e.id, label: `${e.employeeNo} - ${e.fullName}` })),
      types: types.map((t) => ({ value: t.id, label: `${t.name}${t.annualDays ? ` (${t.annualDays} days/yr)` : ""}` })),
    };
  }

  async list() {
    const user = await this.guard("leave.view");
    const scope = await this.scopeOf(user);
    const rows = await prisma.leaveRequest.findMany({
      where: { companyId: user.companyId, employee: { factoryId: { in: scope.factoryIds } } },
      include: {
        employee: { select: { employeeNo: true, fullName: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return {
      canRequest: can(user, "leave.request"),
      canApprove: can(user, "leave.approve"),
      rows: rows.map((r) => ({
        id: r.id,
        requestNo: r.requestNo,
        employee: `${r.employee.employeeNo} - ${r.employee.fullName}`,
        type: r.leaveType.name,
        fromDate: r.fromDate,
        toDate: r.toDate,
        days: r.days,
        status: r.status,
        reason: r.reason,
      })),
    };
  }

  private async load(id: string) {
    const user = await this.guard("leave.view");
    const r = found(await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true, leaveType: true } }), "Leave request");
    await assertRecordInScope(user, r.companyId);
    assertFactoryInScope(await this.scopeOf(user), r.employee.factoryId);
    return { user, r };
  }

  async create(input: unknown) {
    const user = await this.guard("leave.request");
    const d = createSchema.parse(input);
    if (d.toDate < d.fromDate) throw new BusinessRuleError("The end date cannot be before the start date");
    const days = dayCount(d.fromDate, d.toDate);
    if (days > MAX_DAYS) throw new BusinessRuleError(`A single request can be at most ${MAX_DAYS} days`);

    const emp = found(await prisma.employee.findUnique({ where: { id: d.employeeId } }), "Employee");
    await assertRecordInScope(user, emp.companyId);
    assertFactoryInScope(await this.scopeOf(user), emp.factoryId);
    if (emp.status !== "ACTIVE") throw new BusinessRuleError("Only active employees can take leave");
    const type = found(await prisma.leaveType.findUnique({ where: { id: d.leaveTypeId } }), "Leave type");
    if (type.companyId !== user.companyId || !type.isActive) throw new BusinessRuleError("Leave type not available");

    const clash = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: d.employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        fromDate: { lte: d.toDate },
        toDate: { gte: d.fromDate },
      },
    });
    if (clash) throw new BusinessRuleError(`These dates overlap with request ${clash.requestNo}`);

    const row = await prisma.leaveRequest.create({
      data: {
        companyId: user.companyId,
        requestNo: await nextLeaveNo(user.companyId),
        employeeId: d.employeeId,
        leaveTypeId: d.leaveTypeId,
        fromDate: d.fromDate,
        toDate: d.toDate,
        days,
        reason: d.reason,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "LeaveRequest", entityId: row.id, after: row });
    return row;
  }

  // মঞ্জুর হলে হাজিরায় প্রতিদিনের জন্য "LEAVE" বসে যায়
  async approve(id: string) {
    const approver = await this.guard("leave.approve");
    const { r } = await this.load(id);
    if (r.status !== "PENDING") throw new BusinessRuleError("Only a pending request can be approved");

    if (r.leaveType.annualDays > 0) {
      const year = r.fromDate.getUTCFullYear();
      const used = await prisma.leaveRequest.aggregate({
        _sum: { days: true },
        where: {
          employeeId: r.employeeId,
          leaveTypeId: r.leaveTypeId,
          status: "APPROVED",
          fromDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
        },
      });
      const left = r.leaveType.annualDays - (used._sum.days ?? 0);
      if (r.days > left) {
        throw new BusinessRuleError(`Only ${Math.max(left, 0)} day(s) of ${r.leaveType.name} are left this year`);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status: "APPROVED", decidedById: approver.id, decidedAt: new Date() },
      });
      for (let i = 0; i < r.days; i++) {
        const date = addDays(r.fromDate, i);
        await tx.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: r.employeeId, date } },
          create: { companyId: r.companyId, employeeId: r.employeeId, date, status: "LEAVE", recordedById: approver.id },
          update: { status: "LEAVE", overtimeMinutes: 0, recordedById: approver.id },
        });
      }
    });
    await this.audit({ user: approver, action: "UPDATE", entity: "LeaveRequest", entityId: id, before: { status: r.status }, after: { status: "APPROVED" } });
    return { id };
  }

  async reject(id: string, note: string) {
    const approver = await this.guard("leave.approve");
    if (!note || note.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const { r } = await this.load(id);
    if (r.status !== "PENDING") throw new BusinessRuleError("Only a pending request can be rejected");
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED", decidedById: approver.id, decidedAt: new Date(), decisionNote: note.trim() },
    });
    await this.audit({ user: approver, action: "UPDATE", entity: "LeaveRequest", entityId: id, before: { status: r.status }, after: { status: "REJECTED" }, reason: note.trim() });
    return { id };
  }

  // বাতিল করলে ওই দিনগুলোর "LEAVE" হাজিরা মুছে যায়
  async cancel(id: string) {
    const user = await this.guard("leave.request");
    const { r } = await this.load(id);
    if (r.status !== "PENDING" && r.status !== "APPROVED") throw new BusinessRuleError("This request cannot be cancelled");
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
      if (r.status === "APPROVED") {
        await tx.attendanceRecord.deleteMany({
          where: { employeeId: r.employeeId, status: "LEAVE", date: { gte: r.fromDate, lte: r.toDate } },
        });
      }
    });
    await this.audit({ user, action: "UPDATE", entity: "LeaveRequest", entityId: id, before: { status: r.status }, after: { status: "CANCELLED" } });
    return { id };
  }
}

export const leaveService = new LeaveService();
