"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/lib/action-result";
import { portalAdminService } from "@/services/portal-admin.service";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createPortalUserAction(fd: FormData) {
  const type = str(fd, "type");
  const partyId = type === "SUPPLIER" ? str(fd, "supplierId") : str(fd, "buyerId");
  const res = await runAction(() =>
    portalAdminService.create({
      type,
      partyId,
      name: str(fd, "name"),
      email: str(fd, "email"),
      password: str(fd, "password"),
    }),
  );
  revalidatePath("/admin/portal-users");
  const q = res.ok ? `ok=${encodeURIComponent("Portal user created")}` : `err=${encodeURIComponent(res.error)}`;
  redirect(`/admin/portal-users?${q}`);
}