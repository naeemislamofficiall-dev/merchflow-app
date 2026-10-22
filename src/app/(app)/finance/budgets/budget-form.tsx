"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createBudgetAction } from "./actions";

type Values = {
  year: string;
  month: string;
  category: string;
  amountBase: string;
  factoryId: string;
  notes: string;
};

const CATEGORIES = ["FACTORY", "PRODUCTION", "FREIGHT", "SAMPLE", "OTHER"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function BudgetForm({
  year,
  factories,
}: {
  year: number;
  factories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: {
      year: String(year),
      month: String(new Date().getMonth() + 1),
      category: "FACTORY",
      amountBase: "",
      factoryId: "",
      notes: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!(Number(v.amountBase) > 0)) {
      setError("Amount must be more than 0");
      return;
    }
    if (!(Number(v.year) >= 2000)) {
      setError("Enter a valid year");
      return;
    }
    start(async () => {
      const res = await createBudgetAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset({ ...v, amountBase: "", notes: "" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Add budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Year" htmlFor="year" required>
              <Input id="year" type="number" {...register("year")} />
            </FormField>
            <FormField label="Month" htmlFor="month" required>
              <Select id="month" {...register("month")}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="category" required>
              <Select id="category" {...register("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Amount (base currency)" htmlFor="amountBase" required>
              <Input id="amountBase" type="number" step="any" min="0" {...register("amountBase")} />
            </FormField>
            <FormField label="Factory" htmlFor="factoryId" hint="Empty means the whole company">
              <Select id="factoryId" {...register("factoryId")}>
                <option value="">All factories</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Notes" htmlFor="notes">
              <Input id="notes" maxLength={300} {...register("notes")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add budget"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
