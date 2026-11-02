"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-result";
import { scheduledReportService } from "@/services/scheduled-report.service";

const PATH = "/admin/scheduled-reports";

export async function createScheduleAction(values: unknown) {
  const res = await runAction(async () => scheduledReportService.create(values));
  revalidatePath(PATH);
  return res;
}
export async function toggleScheduleAction(id: string) {
  const res = await runAction(async () => scheduledReportService.toggle(id));
  revalidatePath(PATH);
  return res;
}
export async function deleteScheduleAction(id: string) {
  const res = await runAction(async () => scheduledReportService.remove(id));
  revalidatePath(PATH);
  return res;
}
export async function runScheduleNowAction(id: string) {
  const res = await runAction(async () => scheduledReportService.runNow(id));
  revalidatePath(PATH);
  return res;
}