"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { runMrpAction } from "../actions";

const schema = z.object({
  bomId: z.string().min(1, "Select an approved BOM"),
  orderId: z.string(),
  orderQty: z.string().refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Whole number, more than 0"),
});
type Values = z.infer<typeof schema>;

export type BomOption = { id: string; label: string };
export type OrderOption = { id: string; label: string; units: number };

export function MrpForm({ boms, orders }: { boms: BomOption[]; orders: OrderOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { bomId: "", orderId: "", orderQty: "" },
  });

  // order বাছলে পরিমাণ ঘরটা ফাঁকা থাকলে অর্ডারের মোট পিস বসে যায়
  function onOrderChange(id: string) {
    const o = orders.find((x) => x.id === id);
    if (o && !getValues("orderQty")) setValue("orderQty", String(o.units), { shouldValidate: true });
  }

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await runMrpAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/material-requirements/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <FormField
          label="Approved BOM"
          htmlFor="bomId"
          required
          error={errors.bomId?.message}
          hint="Only approved BOMs can be used"
        >
          <Select id="bomId" {...register("bomId")}>
            <option value="">Select BOM...</option>
            {boms.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Order"
          htmlFor="orderId"
          error={errors.orderId?.message}
          hint="Optional. Stock reserved for this order is not counted against it"
        >
          <Select id="orderId" {...register("orderId", { onChange: (e) => onOrderChange(e.target.value) })}>
            <option value="">No order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Quantity (pieces)" htmlFor="orderQty" required error={errors.orderQty?.message}>
          <Input id="orderQty" type="number" min="1" step="1" {...register("orderQty")} />
        </FormField>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Running..." : "Run MRP"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/material-requirements")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}