import { ZodError } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";
import { AuthError } from "@/lib/permissions";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Server Action-এর ভেতরের কাজ চালায়। এরর হলে পেজ না ভেঙে বার্তা ফেরত দেয়।
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    if (e instanceof BusinessRuleError || e instanceof AuthError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof Error && e.message.startsWith("FORBIDDEN_SCOPE")) {
      return { ok: false, error: "You do not have access to this record" };
    }
    console.error(e);
    return { ok: false, error: "Something went wrong" };
  }
}

// ফর্মের ফাঁকা ঘর ("") বাদ দেয়, যাতে ঐচ্ছিক ঘর undefined হয়
export function dropEmpty<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined)
  ) as Partial<T>;
}