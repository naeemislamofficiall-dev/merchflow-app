"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-result";
import { importService } from "@/services/import.service";

export async function confirmImportAction(id: string) {
  const res = await runAction(async () => importService.confirm(id));
  revalidatePath("/import");
  revalidatePath(`/import/${id}`);
  return res;
}