"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { createRfqAction } from "../actions";

type Values = { dueDate: string; notes: string; supplierIds: string[] };

export function RfqForm({ prId, suppliers }: { prId: string; suppliers: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: { dueDate: "", notes: "", supplierIds: [] },
  });

  function onSubmit(v: Values) {
    setError("");
    start(async () => {
      const res = await createRfqAction({ prId, dueDate: v.dueDate, notes: v.notes, supplierIds: v.supplierIds ?? [] });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/rfqs/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Reply due date" htmlFor="dueDate">
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <Input id="notes" maxLength={1000} {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers to ask</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {suppliers.length === 0 && <p className="text-sm text-muted-foreground">No active suppliers.</p>}
          {suppliers.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <input type="checkbox" value={s.id} {...register("supplierIds")} />
              {s.label}
            </label>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create RFQ"}</Button>
    </form>
  );
}