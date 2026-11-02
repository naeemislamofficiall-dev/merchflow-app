import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";

// Server action-er common pattern: kaj chalao, error hole ?error=... shoho page-e ferot pathao.
export async function runAndRedirect(path: string, fn: () => Promise<void>) {
  let error = "";
  try {
    await fn();
  } catch (e) {
    if (e instanceof BusinessRuleError) error = e.message;
    else if (e instanceof ZodError) error = "Invalid input: " + e.issues.map((i) => `${i.path.join(".")} ${i.message}`.trim()).join(", ");
    else throw e;
  }
  const sep = path.includes("?") ? "&" : "?";
  redirect(error ? `${path}${sep}error=${encodeURIComponent(error)}` : path);
}

export const field = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? undefined : v;
};
