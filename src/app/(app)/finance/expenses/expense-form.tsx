"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createExpenseAction } from "../actions";

type Values = {
  category: string;
  expenseDate: string;
  description: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  orderId: string;
  vendorName: string;
};

const CATEGORIES = ["FACTORY", "PRODUCTION", "FREIGHT", "SAMPLE", "OTHER"];

export function ExpenseForm({ orders }: { orders: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: {
      category: "FACTORY",
      expenseDate: "",
      description: "",
      amount: "",
      currency: "BDT",
      exchangeRate: "1",
      orderId: "",
      vendorName: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.expenseDate || v.description.trim().length < 3) {
      setError("Date and a description of at least 3 characters are required");
      return;
    }
    if (!(Number(v.amount) > 0)) {
      setError("Amount must be more than 0");
      return;
    }
    if (v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, for example BDT");
      return;
    }
    start(async () => {
      const res = await createExpenseAction({ ...v, currency: v.currency.trim().toUpperCase() });
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
          <CardTitle>Add expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Category" htmlFor="category" required>
              <Select id="category" {...register("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date" htmlFor="expenseDate" required>
              <Input id="expenseDate" type="date" {...register("expenseDate")} />
            </FormField>
            <FormField label="Amount" htmlFor="amount" required>
              <Input id="amount" type="number" step="any" min="0" {...register("amount")} />
            </FormField>
            <FormField label="Currency" htmlFor="currency" required>
              <Input id="currency" maxLength={3} {...register("currency")} />
            </FormField>
            <FormField label="Exchange rate to base" htmlFor="exchangeRate">
              <Input id="exchangeRate" type="number" step="any" min="0" {...register("exchangeRate")} />
            </FormField>
            <FormField label="Order" htmlFor="orderId" hint="Approved expenses with an order go to its cost">
              <Select id="orderId" {...register("orderId")}>
                <option value="">None</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Vendor" htmlFor="vendorName">
              <Input id="vendorName" maxLength={120} {...register("vendorName")} />
            </FormField>
            <FormField label="Description" htmlFor="description" required>
              <Input id="description" maxLength={300} {...register("description")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add expense"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}