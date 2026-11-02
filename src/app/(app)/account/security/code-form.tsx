"use client";
import { useActionState } from "react";

export type MfaFormState = { error?: string; codes?: string[] };

const input = "rounded-md border bg-background px-3 py-2";

// Server action theke ashe: { error } ba { codes }. Backup code gulo shudhu ei ekbar-i dekhano hoy.
export function CodeForm({
  action,
  submitLabel,
  intro,
}: {
  action: (prev: MfaFormState, fd: FormData) => Promise<MfaFormState>;
  submitLabel: string;
  intro?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as MfaFormState);

  if (state.codes) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Save these backup codes now. They are shown only once, and each works one time if you lose your phone.
        </p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-sm text-amber-950">
          {state.codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <a href="/account/security" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          I have saved them
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border p-4">
      {intro && <p className="text-sm">{intro}</p>}
      <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required className={input} placeholder="123456" />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div>
        <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {pending ? "Working..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
