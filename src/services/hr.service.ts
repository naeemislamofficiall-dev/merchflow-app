import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertFactoryInScope } from "@/lib/scope";
import { nextEmployeeNo } from "@/lib/numbering-extra";
import { addDays } from "@/lib/payroll-calc";
import { can, type SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const code = z.string().trim().min(2, "Code is too short").max(20).transform((s) => s.toUpperCase());
const name = z.string().trim().min(2, "Name is too short").max(100);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the 24-hour format, like 08:00");

const designationSchema = z.object({ code, name });
const shiftSchema = z.object({
  code,
  name,
  startTime: time,
  endTime: time,
  breakMinutes: z.coerce.number().int().min(0).max(240).default(60),
});
const leaveTypeSchema = z.object({
  code,
  name,
  annualDays: z.coerce.number().int().min(0).max(366).default(0),
  isPaid: z.enum(["YES", "NO"]).default("YES"),
});

const employeeSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  factoryId: z.string().min(1, "Select a factory"),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  shiftId: z.string().optional(),
  joinDate: z.coerce.date(),
  phone: z.string().trim().max(30).optional(),
  basicSalary: z.coerce.number().min(0).default(0),
  allowance: z.coerce.number().min(0).default(0),
  overtimeRate: z.coerce.number().min(0).default(0),
});

const skillSchema = z.object({
  skill: z.string().trim().min(2, "Skill is required").max(60),
  level: z.coerce.number().int().min(1).max(5).default(3),
});

class HrService extends BaseService {
  // ---------- মাস্টার ডাটা ----------

  async listMasters() {
    const user = await this.guard("hr.view");
    const where = { companyId: user.companyId };
    const [designations, shifts, leaveTypes] = await Promise.all([
      prisma.designation.findMany({ where, orderBy: { code: "asc" } }),
      prisma.shift.findMany({ where, orderBy: { code: "asc" } }),
      prisma.leaveType.findMany({ where, orderBy: { code: "asc" } }),
    ]);
    return { designations, shifts, leaveTypes };
  }

  private async ensureUniqueCode(
    exists: () => Promise<unknown>
  ) {
    if (await exists()) throw new BusinessRuleError("This code is already used");
  }

  async createDesignation(input: unknown) {
    const user = await this.guard("hr.manage");
    const d = designationSchema.parse(input);
    await this.ensureUniqueCode(() => prisma.designation.findUnique({ where: { companyId_code: { companyId: user.companyId, code: d.code } } }));
    const row = await prisma.designation.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Designation", entityId: row.id, after: row });
    return row;
  }

  async createShift(input: unknown) {
    const user = await this.guard("hr.manage");
    const d = shiftSchema.parse(input);
    await this.ensureUniqueCode(() => prisma.shift.findUnique({ where: { companyId_code: { companyId: user.companyId, code: d.code } } }));
    const row = await prisma.shift.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Shift", entityId: row.id, after: row });
    return row;
  }

  async createLeaveType(input: unknown) {
    const user = await this.guard("hr.manage");
    const d = leaveTypeSchema.parse(input);
    await this.ensureUniqueCode(() => prisma.leaveType.findUnique({ where: { companyId_code: { companyId: user.companyId, code: d.code } } }));
    const row = await prisma.leaveType.create({
      data: { code: d.code, name: d.name, annualDays: d.annualDays, isPaid: d.isPaid === "YES", companyId: user.companyId },
    });
    await this.audit({ user, action: "CREATE", entity: "LeaveType", entityId: row.id, after: row });
    return row;
  }

  async toggleMaster(kind: "designation" | "shift" | "leaveType", id: string) {
    const user = await this.guard("hr.manage");
    if (kind === "designation") {
      const r = found(await prisma.designation.findUnique({ where: { id } }), "Designation");
      await assertRecordInScope(user, r.companyId);
      await prisma.designation.update({ where: { id }, data: { isActive: !r.isActive } });
    } else if (kind === "shift") {
      const r = found(await prisma.shift.findUnique({ where: { id } }), "Shift");
      await assertRecordInScope(user, r.companyId);
      await prisma.shift.update({ where: { id }, data: { isActive: !r.isActive } });
    } else {
      const r = found(await prisma.leaveType.findUnique({ where: { id } }), "Leave type");
      await assertRecordInScope(user, r.companyId);
      await prisma.leaveType.update({ where: { id }, data: { isActive: !r.isActive } });
    }
    await this.audit({ user, action: "UPDATE", entity: kind, entityId: id, after: { toggled: true } });
    return { id };
  }

  // ---------- কর্মী ----------

  async formOptions() {
    const user = await this.guard("hr.manage");
    const scope = await this.scopeOf(user);
    const [factories, departments, designations, shifts] = await Promise.all([
      prisma.factory.findMany({
        where: { id: { in: scope.factoryIds }, companyId: user.companyId },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.department.findMany({
        where: { factoryId: { in: scope.factoryIds }, isActive: true },
        select: { id: true, code: true, name: true, factory: { select: { code: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.designation.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { code: "asc" } }),
      prisma.shift.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { code: "asc" } }),
    ]);
    return {
      factories: factories.map((f) => ({ value: f.id, label: `${f.code} - ${f.name}` })),
      departments: departments.map((d) => ({ value: d.id, label: `${d.factory.code} / ${d.name}` })),
      designations: designations.map((d) => ({ value: d.id, label: d.name })),
      shifts: shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.startTime}-${s.endTime})` })),
    };
  }

  private async checkEmployeeRefs(user: SessionUser, d: z.infer<typeof employeeSchema>) {
    assertFactoryInScope(await this.scopeOf(user), d.factoryId);
    const f = await prisma.factory.findUnique({ where: { id: d.factoryId }, select: { companyId: true } });
    if (!f || f.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
    if (d.departmentId) {
      const dep = await prisma.department.findUnique({ where: { id: d.departmentId }, select: { factoryId: true } });
      if (!dep || dep.factoryId !== d.factoryId) throw new BusinessRuleError("Department does not belong to this factory");
    }
    if (d.designationId) {
      const x = await prisma.designation.findUnique({ where: { id: d.designationId }, select: { companyId: true } });
      if (!x || x.companyId !== user.companyId) throw new BusinessRuleError("Designation not found");
    }
    if (d.shiftId) {
      const x = await prisma.shift.findUnique({ where: { id: d.shiftId }, select: { companyId: true } });
      if (!x || x.companyId !== user.companyId) throw new BusinessRuleError("Shift not found");
    }
  }

  async createEmployee(input: unknown) {
    const user = await this.guard("hr.manage");
    const d = employeeSchema.parse(input);
    await this.checkEmployeeRefs(user, d);
    const row = await prisma.employee.create({
      data: { ...d, companyId: user.companyId, employeeNo: await nextEmployeeNo(user.companyId), createdById: user.id },
    });
    await this.audit({
      user, action: "CREATE", entity: "Employee", entityId: row.id,
      after: { employeeNo: row.employeeNo, fullName: row.fullName, factoryId: row.factoryId },
    });
    return row;
  }

  async listEmployees(filter: { factoryId?: string; status?: string } = {}) {
    const user = await this.guard("hr.view");
    const scope = await this.scopeOf(user);
    if (filter.factoryId) assertFactoryInScope(scope, filter.factoryId);
    const canSeePay = can(user, "payroll.view");
    const rows = await prisma.employee.findMany({
      where: {
        ...(await listFilter(user)),
        factoryId: filter.factoryId ? filter.factoryId : { in: scope.factoryIds },
        ...(filter.status === "ACTIVE" || filter.status === "RESIGNED" || filter.status === "TERMINATED"
          ? { status: filter.status }
          : {}),
      },
      orderBy: { employeeNo: "asc" },
      take: 1000,
    });
    const [des, fac, dep] = await Promise.all([
      prisma.designation.findMany({ where: { companyId: user.companyId }, select: { id: true, name: true } }),
      prisma.factory.findMany({ where: { id: { in: scope.factoryIds } }, select: { id: true, code: true } }),
      prisma.department.findMany({ where: { factoryId: { in: scope.factoryIds } }, select: { id: true, name: true } }),
    ]);
    const dn = new Map(des.map((x) => [x.id, x.name]));
    const fn = new Map(fac.map((x) => [x.id, x.code]));
    const pn = new Map(dep.map((x) => [x.id, x.name]));
    return {
      canSeePay,
      canManage: can(user, "hr.manage"),
      rows: rows.map((e) => ({
        id: e.id,
        employeeNo: e.employeeNo,
        fullName: e.fullName,
        factory: fn.get(e.factoryId) ?? "-",
        department: e.departmentId ? (pn.get(e.departmentId) ?? "-") : "-",
        designation: e.designationId ? (dn.get(e.designationId) ?? "-") : "-",
        joinDate: e.joinDate,
        status: e.status,
        basicSalary: canSeePay ? Number(e.basicSalary) : null,
      })),
    };
  }

  async getEmployee(id: string) {
    const user = await this.guard("hr.view");
    const e = found(
      await prisma.employee.findUnique({
        where: { id },
        include: { skills: { orderBy: { skill: "asc" } }, allocations: { orderBy: { fromDate: "desc" } } },
      }),
      "Employee"
    );
    await assertRecordInScope(user, e.companyId);
    assertFactoryInScope(await this.scopeOf(user), e.factoryId);

    const lineIds = [...new Set(e.allocations.map((a) => a.lineId))];
    const lines = await prisma.line.findMany({ where: { id: { in: lineIds } }, select: { id: true, code: true, name: true } });
    const ln = new Map(lines.map((l) => [l.id, `${l.code} - ${l.name}`]));
    const [des, shift, dep, fac] = await Promise.all([
      e.designationId ? prisma.designation.findUnique({ where: { id: e.designationId }, select: { name: true } }) : null,
      e.shiftId ? prisma.shift.findUnique({ where: { id: e.shiftId }, select: { name: true, startTime: true, endTime: true } }) : null,
      e.departmentId ? prisma.department.findUnique({ where: { id: e.departmentId }, select: { name: true } }) : null,
      prisma.factory.findUnique({ where: { id: e.factoryId }, select: { code: true, name: true } }),
    ]);
    const canManage = can(user, "hr.manage");
    const lineOptions = canManage
      ? await prisma.line.findMany({
          where: { isActive: true, floor: { building: { factoryId: e.factoryId } } },
          select: { id: true, code: true, name: true },
          orderBy: { code: "asc" },
        })
      : [];

    return {
      employee: e,
      canManage,
      canSeePay: can(user, "payroll.view"),
      factory: fac ? `${fac.code} - ${fac.name}` : "-",
      department: dep?.name ?? "-",
      designation: des?.name ?? "-",
      shift: shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : "-",
      skills: e.skills.map((s) => ({ id: s.id, skill: s.skill, level: s.level })),
      allocations: e.allocations.map((a) => ({
        id: a.id,
        line: ln.get(a.lineId) ?? "-",
        fromDate: a.fromDate,
        toDate: a.toDate,
      })),
      lineOptions: lineOptions.map((l) => ({ value: l.id, label: `${l.code} - ${l.name}` })),
    };
  }

  private async loadEmployeeForWrite(id: string) {
    const user = await this.guard("hr.manage");
    const e = found(await prisma.employee.findUnique({ where: { id } }), "Employee");
    await assertRecordInScope(user, e.companyId);
    assertFactoryInScope(await this.scopeOf(user), e.factoryId);
    return { user, e };
  }

  async setStatus(id: string, status: "ACTIVE" | "RESIGNED" | "TERMINATED", reason?: string) {
    const { user, e } = await this.loadEmployeeForWrite(id);
    if (e.status === status) throw new BusinessRuleError("The employee already has this status");
    if (status !== "ACTIVE" && (!reason || reason.trim().length < 3)) throw new BusinessRuleError("A reason is required");
    const row = await prisma.employee.update({
      where: { id },
      data: { status, exitDate: status === "ACTIVE" ? null : new Date() },
    });
    await this.audit({
      user, action: "UPDATE", entity: "Employee", entityId: id,
      before: { status: e.status }, after: { status: row.status }, reason: reason?.trim(),
    });
    return row;
  }

  async addSkill(employeeId: string, input: unknown) {
    const { user } = await this.loadEmployeeForWrite(employeeId);
    const d = skillSchema.parse(input);
    const dup = await prisma.employeeSkill.findUnique({ where: { employeeId_skill: { employeeId, skill: d.skill } } });
    if (dup) throw new BusinessRuleError("This skill is already added");
    const row = await prisma.employeeSkill.create({ data: { employeeId, ...d } });
    await this.audit({ user, action: "UPDATE", entity: "Employee", entityId: employeeId, after: { addedSkill: d.skill } });
    return row;
  }

  async removeSkill(skillId: string) {
    const s = found(await prisma.employeeSkill.findUnique({ where: { id: skillId } }), "Skill");
    const { user } = await this.loadEmployeeForWrite(s.employeeId);
    await prisma.employeeSkill.delete({ where: { id: skillId } });
    await this.audit({ user, action: "UPDATE", entity: "Employee", entityId: s.employeeId, after: { removedSkill: s.skill } });
    return { id: s.employeeId };
  }

  // অপারেটরকে লাইনে বসানো: আগের চলতি বরাদ্দ একদিন আগে শেষ হয়
  async allocate(employeeId: string, input: unknown) {
    const { user, e } = await this.loadEmployeeForWrite(employeeId);
    const d = z.object({ lineId: z.string().min(1, "Select a line"), fromDate: z.coerce.date() }).parse(input);
    if (e.status !== "ACTIVE") throw new BusinessRuleError("Only active employees can be allocated");
    const line = await prisma.line.findFirst({
      where: { id: d.lineId, isActive: true, floor: { building: { factoryId: e.factoryId } } },
      select: { id: true },
    });
    if (!line) throw new BusinessRuleError("This line does not belong to the employee's factory");

    const row = await prisma.$transaction(async (tx) => {
      const open = await tx.operatorAllocation.findFirst({ where: { employeeId, toDate: null } });
      if (open) {
        const end = addDays(d.fromDate, -1);
        await tx.operatorAllocation.update({
          where: { id: open.id },
          data: { toDate: end < open.fromDate ? open.fromDate : end },
        });
      }
      return tx.operatorAllocation.create({
        data: { companyId: e.companyId, employeeId, lineId: d.lineId, fromDate: d.fromDate },
      });
    });
    await this.audit({ user, action: "UPDATE", entity: "Employee", entityId: employeeId, after: { allocatedLine: d.lineId } });
    return row;
  }
}

export const hrService = new HrService();
