"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { createRouteAction } from "./actions";

// প্রক্রিয়ার স্বাভাবিক ক্রম। টিক দেওয়াগুলো এই ক্রমেই route-এ বসবে।
const PROCESSES = ["CUTTING", "PRINTING", "EMBROIDERY", "SEWING", "WASHING", "FINISHING", "PACKING"];

type Values = { code: string; name: string; steps: string[] };

export function RouteForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: { code: "", name: "", steps: ["CUTTING", "SEWING", "FINISHING", "PACKING"] },
  });

  function onSubmit(values: Values) {
    setError("");
    const steps = PROCESSES.filter((p) => values.steps.includes(p));
    if (!values.code.trim() || !values.name.trim()) {
      setError("Code and name are required");
      return;
    }
    if (steps.length < 2) {
      setError("A route needs at least 2 processes");
      return;
    }
    start(async () => {
      const res = await createRouteAction({ code: values.code.trim(), name: values.name.trim(), steps });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Add route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Code" htmlFor="route-code" required>
              <Input id="route-code" maxLength={30} {...register("code")} />
            </FormField>
            <FormField label="Name" htmlFor="route-name" required>
              <Input id="route-name" maxLength={100} {...register("name")} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {PROCESSES.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input type="checkbox" value={p} {...register("steps")} />
                {p.toLowerCase()}
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add route"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}