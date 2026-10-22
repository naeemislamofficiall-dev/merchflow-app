"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { budgetService } from "@/services/budget.service";

export async function createBudgetAction(values: {
  year: string;
  month: string;
  category: string;
  amountBase: string;
  factoryId: string;
  notes: string;
}) {
  return runAction(async () => {
    const { year, month, amountBase, ...rest } = dropEmpty(values);
    const row = await budgetService.create({
      ...rest,
      year: Number(year),
      month: Number(month),
      amountBase: Number(amountBase),
    });
    return { id: row.id };
  });
}

export async function updateBudgetAmountAction(id: string, amount: string) {
  return runAction(async () => {
    await budgetService.updateAmount(id, Number(amount));
    return { id };
  });
}

export async function approveBudgetAction(id: string) {
  return runAction(async () => {
    await budgetService.approve(id);
    return { id };
  });
}

export async function closeBudgetAction(id: string) {
  return runAction(async () => {
    await budgetService.close(id);
    return { id };
  });
}

export async function cancelBudgetAction(id: string, reason: string) {
  return runAction(async () => {
    await budgetService.cancel(id, reason);
    return { id };
  });
}
