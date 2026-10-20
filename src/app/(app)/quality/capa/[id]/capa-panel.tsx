"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { advanceCapaAction, cancelCapaAction } from "../actions";

type Values = {
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  ownerId: string;
  dueDate: string;
  verificationNote: string;
};

// প্রতিটা অবস্থা থেকে কোথায় যাওয়া যায় (সার্ভিসের নিয়মের সাথে মেলানো)
const STEPS: Record<string, { to: string; label: string; outline?: boolean }[]> = {
  OPEN: [{ to: "ROOT_CAUSE", label: "Start root cause analysis" }],
  ROOT_CAUSE: [{ to: "ACTION", label: "Move to action" }],
  ACTION: [{ to: "VERIFICATION", label: "Send for verification" }],
  VERIFICATION: [
    { to: "CLOSED", label: "Verify and close" },
    { to: "ACTION", label: "Back to action", outline: true },
  ],
};
const CANCELLABLE = ["OPEN", "ROOT_CAUSE", "ACTION"];

export function CapaPanel({
  capaId,
  status,
  users,
  initial,
}: {
  capaId: string;
  status: string;
  users: { id: string; label: string }[];
  initial: Values;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, getValues } = useForm<Values>({ defaultValues: initial });

  const steps = STEPS[status] ?? [];
  if (steps.length === 0) return null;

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this CAPA being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelCapaAction(capaId, reason.trim()));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work on this CAPA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Root cause" htmlFor="rootCause">
          <Textarea id="rootCause" rows={3} maxLength={1000} {...register("rootCause")} />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Corrective action" htmlFor="correctiveAction">
            <Textarea id="correctiveAction" rows={3} maxLength={1000} {...register("correctiveAction")} />
          </FormField>
          <FormField label="Preventive action" htmlFor="preventiveAction">
            <Textarea id="preventiveAction" rows={3} maxLength={1000} {...register("preventiveAction")} />
          </FormField>
          <FormField label="Owner" htmlFor="ownerId">
            <Select id="ownerId" {...register("ownerId")}>
              <option value="">Not assigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Due date" htmlFor="dueDate">
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </FormField>
        </div>
        <FormField label="Verification note" htmlFor="verificationNote" hint="Required before closing">
          <Textarea id="verificationNote" rows={2} maxLength={1000} {...register("verificationNote")} />
        </FormField>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <Button
              key={s.to + s.label}
              size="sm"
              variant={s.outline ? "outline" : undefined}
              disabled={pending}
              onClick={() => run(() => advanceCapaAction(capaId, s.to, getValues()))}
            >
              {s.label}
            </Button>
          ))}
          {CANCELLABLE.includes(status) && (
            <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
              Cancel CAPA
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}