"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/permissions";
import { setActiveContext } from "@/services/context.service";
import { runAction } from "@/lib/action-result";
import { NotificationType } from "@/generated/prisma/enums";
import { notificationService } from "@/services/notification.service";
import { searchService } from "@/services/search.service";

// Logout: session মুছে লগইন পেজে পাঠায়
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

// টপবারের ড্রপডাউন থেকে কোম্পানি বদল (cookie-তে সেট হয়, scope-এর বাইরে হলে এরর)
export async function switchCompanyAction(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return;
  await setActiveContext(user.id, { companyId });
  revalidatePath("/", "layout");
}

// টপবারের সার্চ বক্স: প্রতিটি অক্ষরে নয়, ডিবাউন্স করে ডাকা হয়
export async function searchAction(query: string) {
  return runAction(() => searchService.search(query));
}

export async function markNotificationReadAction(id: string) {
  return runAction(async () => {
    await notificationService.markRead(id);
    revalidatePath("/", "layout");
    return { id };
  });
}

export async function markAllNotificationsReadAction() {
  return runAction(async () => {
    await notificationService.markAllRead();
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function setNotificationPreferenceAction(type: string, inApp: boolean, email: boolean) {
  return runAction(async () => {
    if (!(Object.values(NotificationType) as string[]).includes(type)) {
      throw new Error("Unknown notification type");
    }
    await notificationService.setPreference(type as NotificationType, inApp, email);
    return { type };
  });
}