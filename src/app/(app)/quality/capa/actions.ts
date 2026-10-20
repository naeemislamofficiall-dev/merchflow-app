"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { capaService } from "@/services/capa.service";

export async function createCapaAction(values: {
  title: string;
  category: string;
  problem: string;
  ownerId: string;
  dueDate: string;
}) {
  return runAction(async () => {
    const row = await capaService.create(dropEmpty(values));
    return { id: row.id };
  });
}

export async function advanceCapaAction(
  id: string,
  to: string,
  values: {
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
    ownerId: string;
    dueDate: string;
    verificationNote: string;
  }
) {
  return runAction(async () => {
    // to-এর মান service-এর CapaStatus enum-এর একটি
    await capaService.advance(id, to as Parameters<typeof capaService.advance>[1], dropEmpty(values));
    return { id };
  });
}

export async function cancelCapaAction(id: string, reason: string) {
  return runAction(async () => {
    await capaService.cancel(id, reason);
    return { id };
  });
}