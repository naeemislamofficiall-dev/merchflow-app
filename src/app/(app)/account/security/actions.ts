"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { mfaService } from "@/services/mfa.service";
import type { MfaFormState } from "./code-form";

const code = (fd: FormData) => String(fd.get("code") ?? "");

function toState(e: unknown): MfaFormState {
  if (e instanceof BusinessRuleError) return { error: e.message };
  throw e;
}

export async function enableMfaAction(_prev: MfaFormState, fd: FormData): Promise<MfaFormState> {
  try {
    return { codes: await mfaService.enable(code(fd)) };
  } catch (e) {
    return toState(e);
  }
}

export async function regenerateCodesAction(_prev: MfaFormState, fd: FormData): Promise<MfaFormState> {
  try {
    return { codes: await mfaService.regenerateBackupCodes(code(fd)) };
  } catch (e) {
    return toState(e);
  }
}

async function run(fn: () => Promise<void>) {
  let error = "";
  try {
    await fn();
  } catch (e) {
    if (e instanceof BusinessRuleError) error = e.message;
    else throw e;
  }
  revalidatePath("/account/security");
  redirect(`/account/security${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export const beginMfaAction = async () => run(() => mfaService.begin());
export const disableMfaAction = async (fd: FormData) => run(() => mfaService.disable(code(fd)));
