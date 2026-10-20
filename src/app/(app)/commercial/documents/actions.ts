"use server";

import { revalidatePath } from "next/cache";
import { dropEmpty, runAction } from "@/lib/action-result";
import type { ExportDocStatus } from "@/generated/prisma/enums";
import { exportDocumentService } from "@/services/export-document.service";

const PATH = "/commercial/documents";

export async function createDocAction(values: {
  docType: string;
  docNo: string;
  shipmentId: string;
  issueDate: string;
  amount: string;
  currency: string;
  remarks: string;
}) {
  return runAction(async () => {
    const row = await exportDocumentService.create(dropEmpty(values));
    revalidatePath(PATH);
    return { id: row.id };
  });
}

export async function setDocStatusAction(id: string, to: string, handoverTo: string, handoverDate: string) {
  return runAction(async () => {
    await exportDocumentService.setStatus(id, to as ExportDocStatus, {
      handoverTo: handoverTo || undefined,
      handoverDate: /^\d{4}-\d{2}-\d{2}$/.test(handoverDate) ? new Date(handoverDate) : undefined,
    });
    revalidatePath(PATH);
    return { id };
  });
}

export async function deleteDocAction(id: string) {
  return runAction(async () => {
    await exportDocumentService.remove(id);
    revalidatePath(PATH);
    return { id };
  });
}