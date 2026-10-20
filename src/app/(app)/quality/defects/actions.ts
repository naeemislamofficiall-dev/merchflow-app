"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { qualityService } from "@/services/quality.service";

export async function createDefectAction(values: {
  code: string;
  name: string;
  category: string;
  severity: string;
}) {
  return runAction(async () => {
    const row = await qualityService.createDefect(dropEmpty(values));
    return { id: row.id };
  });
}