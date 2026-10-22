import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { assertFactoryInScope } from "@/lib/scope";
import { budgetUsage, monthRange } from "@/lib/budget-calc";
import { round2 } from "@/lib/finance-calc";
import { BaseService } from "./base.service";

const CATEGORIES = ["FACTORY", "PRODUCTION", "FREIGHT", "SAMPLE", "OTHER"] as const;

const createSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  category: z.enum(CATEGORIES),
  amountBase: z.coerce.number().positive("Amount must be more than 0"),
  factoryId: z.string().optional(),
  notes: z.string().max(300).optional(),
});

function requireStatus(current: string, allowed: string[], what: string) {
  if (!allowed.includes(current)) {
    throw new BusinessRuleError(`You cannot ${what} when the budget is ${current.toLowerCase()}`);
  }
}

class BudgetService extends BaseService {
  private async load(id: string) {
    const user = await this.guard("budget.view");
    const row = found(await prisma.budget.findUnique({ where: { id } }), "Budget");
    await assertRecordInScope(user, row.companyId);
    return { user, row };
  }

  async formOptions() {
    const user = await this.guard("budget.create");
    const scope = await this.scopeOf(user);
    const factories = await prisma.factory.findMany({
      where: { id: { in: scope.factoryIds }, companyId: user.companyId },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });
    return { factories: factories.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` })) };
  }

  async create(input: unknown) {
    const user = await this.guard("budget.create");
    const d = createSchema.parse(input);
    if (d.factoryId) {
      assertFactoryInScope(await this.scopeOf(user), d.factoryId);
      const f = await prisma.factory.findUnique({ where: { id: d.factoryId }, select: { companyId: true } });
      if (!f || f.companyId !== user.companyId) throw new BusinessRuleError("Factory not found");
    }
    const dup = await prisma.budget.findFirst({
      where: {
        companyId: user.companyId,
        factoryId: d.factoryId ?? null,
        year: d.year,
        month: d.month,
        category: d.category,
        status: { not: "CANCELLED" },
      },
    });
    if (dup) throw new BusinessRuleError("A budget for this period and category already exists");

    const row = await prisma.budget.create({
      data: { ...d, amountBase: round2(d.amountBase), companyId: user.companyId, createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "Budget", entityId: row.id, after: row });
    return row;
  }

  // Draft অবস্থায় শুধু পরিমাণ বদলানো যায়; Approved হলে জমে যায়
  async updateAmount(id: string, amount: number) {
    const { user, row } = await this.load(id);
    await this.guard("budget.create");
    requireStatus(row.status, ["DRAFT"], "change the amount");
    if (!(amount > 0)) throw new BusinessRuleError("Amount must be more than 0");
    const updated = await prisma.budget.update({ where: { id }, data: { amountBase: round2(amount) } });
    await this.audit({
      user, action: "UPDATE", entity: "Budget", entityId: id,
      before: { amountBase: row.amountBase }, after: { amountBase: updated.amountBase },
    });
    return updated;
  }

  async approve(id: string) {
    const user = await this.guard("budget.approve");
    const { row } = await this.load(id);
    requireStatus(row.status, ["DRAFT"], "approve");
    const updated = await prisma.budget.update({ where: { id }, data: { status: "APPROVED", approvedById: user.id } });
    await this.audit({ user, action: "UPDATE", entity: "Budget", entityId: id, before: { status: row.status }, after: { status: updated.status } });
    return updated;
  }

  async close(id: string) {
    const user = await this.guard("budget.approve");
    const { row } = await this.load(id);
    requireStatus(row.status, ["APPROVED"], "close");
    const updated = await prisma.budget.update({ where: { id }, data: { status: "CLOSED" } });
    await this.audit({ user, action: "UPDATE", entity: "Budget", entityId: id, before: { status: row.status }, after: { status: updated.status } });
    return updated;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("budget.cancel");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const { row } = await this.load(id);
    requireStatus(row.status, ["DRAFT", "APPROVED"], "cancel");
    const updated = await prisma.budget.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason.trim() } });
    await this.audit({ user, action: "UPDATE", entity: "Budget", entityId: id, before: { status: row.status }, after: { status: updated.status }, reason: reason.trim() });
    return updated;
  }

  // বছরের সব বাজেট + সেই মাসে Approved খরচ (আসল) পাশাপাশি
  async overview(year: number) {
    const user = await this.guard("budget.view");
    const scope = await this.scopeOf(user);
    const budgets = await prisma.budget.findMany({
      where: {
        ...(await listFilter(user)),
        year,
        status: { not: "CANCELLED" },
        OR: [{ factoryId: null }, { factoryId: { in: scope.factoryIds } }],
      },
      orderBy: [{ month: "asc" }, { category: "asc" }],
    });

    const expenses = await prisma.expense.findMany({
      where: {
        companyId: { in: scope.companyIds },
        status: "APPROVED",
        expenseDate: { gte: monthRange(year, 1).from, lt: monthRange(year, 12).to },
      },
      select: { category: true, factoryId: true, expenseDate: true, amount: true, exchangeRate: true },
    });

    const rows = budgets.map((b) => {
      const { from, to } = monthRange(b.year, b.month);
      const actual = expenses
        .filter(
          (e) =>
            e.category === b.category &&
            e.expenseDate >= from &&
            e.expenseDate < to &&
            (!b.factoryId || e.factoryId === b.factoryId)
        )
        .reduce((s, e) => s + Number(e.amount) * Number(e.exchangeRate), 0);
      return {
        id: b.id,
        year: b.year,
        month: b.month,
        category: b.category,
        factoryId: b.factoryId,
        status: b.status,
        notes: b.notes,
        ...budgetUsage(Number(b.amountBase), actual),
      };
    });

    // মোট হিসাব শুধু Approved/Closed বাজেট ধরে
    const counted = rows.filter((r) => r.status === "APPROVED" || r.status === "CLOSED");
    const totalBudget = round2(counted.reduce((s, r) => s + r.budget, 0));
    const totalActual = round2(counted.reduce((s, r) => s + r.actual, 0));
    return { rows, totals: budgetUsage(totalBudget, totalActual) };
  }
}

export const budgetService = new BudgetService();
