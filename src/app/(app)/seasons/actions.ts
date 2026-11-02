"use server";

import { runAction } from "@/lib/action-result";
import { seasonService } from "@/services/season.service";

type SeasonValues = { code: string; name: string };

export async function createSeasonAction(values: SeasonValues) {
  return runAction(async () => {
    const row = await seasonService.create(values);
    return { id: row.id };
  });
}

export async function updateSeasonAction(id: string, values: SeasonValues) {
  return runAction(async () => {
    const row = await seasonService.update(id, values);
    return { id: row.id };
  });
}