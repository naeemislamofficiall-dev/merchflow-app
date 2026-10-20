"use server";

import { revalidatePath } from "next/cache";
import { dropEmpty, runAction } from "@/lib/action-result";
import { BusinessRuleError } from "@/lib/business-rules";
import { followUpService } from "@/services/followup.service";

const PATH = "/follow-ups";

export async function addContactAction(values: {
  followUpId: string;
  method: string;
  contactPerson: string;
  notes: string;
}) {
  return runAction(async () => {
    await followUpService.addContact(dropEmpty(values));
    revalidatePath(PATH);
    return { id: values.followUpId };
  });
}

export async function revisePromiseAction(id: string, date: string, remarks: string) {
  return runAction(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BusinessRuleError("Use the format YYYY-MM-DD");
    await followUpService.revisePromise(id, new Date(date), remarks.trim() || undefined);
    revalidatePath(PATH);
    return { id };
  });
}

export async function escalateAction(id: string, note: string) {
  return runAction(async () => {
    await followUpService.escalate(id, note);
    revalidatePath(PATH);
    return { id };
  });
}

export async function markReceivedAction(id: string) {
  return runAction(async () => {
    await followUpService.markReceived(id);
    revalidatePath(PATH);
    return { id };
  });
}

export async function refreshDelaysAction() {
  return runAction(async () => {
    const res = await followUpService.refreshDelays();
    revalidatePath(PATH);
    return res;
  });
}