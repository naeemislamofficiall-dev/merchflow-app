"use server";

import { revalidatePath } from "next/cache";
import { dropEmpty, runAction } from "@/lib/action-result";
import { documentService } from "@/services/document.service";

export async function registerDocumentAction(v: {
  entityType: string;
  entityId: string;
  fileName: string;
  docType: string;
  storageUrl: string;
  expiryDate: string;
  access: string;
}) {
  return runAction(async () => {
    const url = v.storageUrl.trim();
    const row = await documentService.register(
      dropEmpty({ ...v, storageKey: url || `manual/${v.fileName.trim()}` })
    );
    revalidatePath("/documents");
    return { id: row.id };
  });
}

export async function deleteDocumentAction(id: string) {
  return runAction(async () => {
    await documentService.remove(id);
    revalidatePath("/documents");
    return { id };
  });
}