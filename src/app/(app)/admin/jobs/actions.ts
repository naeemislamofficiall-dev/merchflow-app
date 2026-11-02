"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-result";
import { jobService } from "@/services/job.service";

export async function runJobAction(key: string) {
  const res = await runAction(async () => jobService.runNow(key));
  revalidatePath("/admin/jobs");
  return res;
}