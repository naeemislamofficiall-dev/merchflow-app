"use server";

import { runAction } from "@/lib/action-result";
import { routingService } from "@/services/routing.service";

export async function createRouteAction(values: { code: string; name: string; steps: string[] }) {
  return runAction(async () => {
    const row = await routingService.create(values);
    return { id: row.id };
  });
}