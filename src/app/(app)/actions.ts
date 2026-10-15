"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/permissions";
import { setActiveContext } from "@/services/context.service";

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