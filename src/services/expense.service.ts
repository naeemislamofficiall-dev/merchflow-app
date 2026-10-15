import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertTransition, expenseTransitions } from "@/lib/status-rules";
import { nextExpenseNo } from "@/lib/numbering";
import { round2 } from "@/lib/finance-calc";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { ExpenseStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const createSchema = z.object({
  category: z.enum(["FACTORY", "PRODUCTION", "FREIGHT", "SAMPLE", "OTHER"]),
  factoryId: z.string().optional(),
  expenseDate: z.coerce.date(),
  description: z.string().min(3).max(300),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default("BDT"),
  exchangeRate: z.coerce.number().positive().default(1),
  orderId: z.string().optional(),
  styleId: z.string().optional(),
  vendorName: z.string().max(120).optional(),
});

class ExpenseService extends BaseService {
  private async load(id: string) {
    return found(await prisma.expense.findUnique({ where: { id } }), "Expense");
  }

  async create(input: unknown) {
    const user = await this.guard("expense.create");
    const d = createSchema.parse(input);
    if (d.styleId && !d.orderId) throw new BusinessRuleError("Select the order for this style");
    if (d.orderId) {
      const order = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
      if (order.companyId !== user.companyId) throw new BusinessRuleError("Order not found");
    }
    const row = await prisma.expense.create({
      data: { ...d, companyId: user.companyId, expenseNo: await nextExpenseNo(user.companyId), createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "Expense", entityId: row.id, after: row });
    return row;
  }

  async list(filter: { status?: ExpenseStatus; orderId?: string } = {}) {
    const user = await this.guard("expense.view");
    return prisma.expense.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  // Approve করলে অর্ডারের সাথে জোড়া খরচ CostAllocation-এ যায়
  async approve(id: string) {
    const user = await this.guard("expense.approve");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertTransition(expenseTransitions, before.status, "APPROVED");

    const [row] = await prisma.$transaction([
      prisma.expense.update({ where: { id }, data: { status: "APPROVED", approvedById: user.id } }),
      prisma.costAllocation.createMany({
        data: before.orderId
          ? [{
              companyId: before.companyId,
              sourceType: "EXPENSE",
              sourceId: id,
              orderId: before.orderId,
              styleId: before.styleId,
              amountBase: round2(Number(before.amount) * Number(before.exchangeRate)),
              note: before.expenseNo,
            }]
          : [],
      }),
    ]);
    await this.audit({
      user, action: "UPDATE", entity: "Expense", entityId: id,
      before: { status: before.status }, after: { status: row.status },
    });
    return row;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("expense.cancel");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertTransition(expenseTransitions, before.status, "CANCELLED");
    const [row] = await prisma.$transaction([
      prisma.expense.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } }),
      prisma.costAllocation.deleteMany({ where: { sourceType: "EXPENSE", sourceId: id } }),
    ]);
    await this.audit({
      user, action: "UPDATE", entity: "Expense", entityId: id,
      before: { status: before.status }, after: { status: row.status }, reason,
    });
    return row;
  }
}

export const expenseService = new ExpenseService();