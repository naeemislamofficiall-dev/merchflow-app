"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { payrollService } from "@/services/payroll.service";

export async function generatePayrollAction(values: Record<string, string>) {
  return runAction(async () => {
    const r = await payrollService.generate(dropEmpty(values));
    return { id: r.id };
  });
}
export async function approvePayrollAction(id: string) {
  return runAction(async () => payrollService.approve(id));
}
export async function markPayrollPaidAction(id: string) {
  return runAction(async () => payrollService.markPaid(id));
}
export async function cancelPayrollAction(id: string, reason?: string) {
  return runAction(async () => payrollService.cancel(id, reason ?? ""));
}
