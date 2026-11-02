"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { BusinessRuleError } from "@/lib/business-rules";
import { PortalAccessError } from "@/lib/portal-scope";
import { portalBuyerService } from "@/services/portal-buyer.service";

function text(e: unknown): string {
  if (e instanceof PortalAccessError || e instanceof BusinessRuleError) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Invalid input";
  console.error(e);
  return "Something went wrong";
}

function back(kind: "ok" | "err", message: string): never {
  revalidatePath("/portal/buyer");
  redirect(`/portal/buyer?${kind}=${encodeURIComponent(message)}`);
}

export async function decideSampleAction(fd: FormData) {
  const comments = String(fd.get("comments") ?? "").trim();
  try {
    await portalBuyerService.decideSample({
      sampleId: String(fd.get("sampleId") ?? ""),
      decision: String(fd.get("decision") ?? ""),
      comments: comments === "" ? undefined : comments,
    });
  } catch (e) {
    back("err", text(e));
  }
  back("ok", "Decision saved");
}