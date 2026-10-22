"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import type { ActionResult } from "@/lib/action-result";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  emptyLabel?: string; // select-এর ফাঁকা বিকল্পের লেখা (যেমন "None")
};

// একটা সাধারণ "নতুন যোগ করো" ফর্ম। action হলো Server Action।
export function CreateForm({
  title,
  fields,
  action,
  submitLabel,
  redirectBase,
  columns = 4,
}: {
  title: string;
  fields: Field[];
  action: (values: Record<string, string>) => Promise<ActionResult<unknown>>;
  submitLabel?: string;
  redirectBase?: string; // দিলে সফল হলে `${redirectBase}/${id}` পেজে যায়
  columns?: 2 | 3 | 4;
}) {
  const router = useRouter();
  const initial = Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    for (const f of fields) {
      if (f.required && !(values[f.name] ?? "").trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    start(async () => {
      const res = await action(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const data = res.data as { id?: string } | null;
      if (redirectBase && data && typeof data.id === "string") {
        router.push(`${redirectBase}/${data.id}`);
        return;
      }
      setValues(initial);
      router.refresh();
    });
  }

  const grid = columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid gap-4 ${grid}`}>
            {fields.map((f) => (
              <FormField key={f.name} label={f.label} htmlFor={f.name} required={f.required} hint={f.hint}>
                {f.type === "select" ? (
                  <Select
                    id={f.name}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  >
                    <option value="">{f.emptyLabel ?? "Select"}</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type ?? "text"}
                    step={f.type === "number" ? "any" : undefined}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  />
                )}
              </FormField>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : (submitLabel ?? "Save")}</Button>
        </CardContent>
      </Card>
    </form>
  );
}

export type RowAction = {
  label: string;
  // Server Action: প্রথম আর্গুমেন্ট রেকর্ডের id, দ্বিতীয়টা কারণ (শুধু reason থাকলে)
  action: (id: string, reason?: string) => Promise<ActionResult<unknown>>;
  reason?: string; // দিলে কারণ জিজ্ঞেস করে (prompt-এর লেখা)
  confirm?: string; // দিলে নিশ্চিত করতে জিজ্ঞেস করে
  variant?: "default" | "outline" | "gold" | "destructive";
};

// টেবিলের প্রতি সারির বাটন (Approve, Cancel ইত্যাদি)
export function RowActions({ id, actions }: { id: string; actions: RowAction[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(a: RowAction) {
    setError("");
    let reason: string | undefined;
    if (a.reason) {
      const r = window.prompt(a.reason);
      if (r === null) return;
      if (r.trim().length < 3) {
        setError("A reason is required (at least 3 characters)");
        return;
      }
      reason = r.trim();
    }
    if (a.confirm && !window.confirm(a.confirm)) return;
    start(async () => {
      const res = await a.action(id, reason);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (actions.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.map((a) => (
          <Button key={a.label} size="sm" variant={a.variant ?? "outline"} disabled={pending} onClick={() => run(a)}>
            {a.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
