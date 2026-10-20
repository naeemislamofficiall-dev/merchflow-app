"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createPoAction } from "../actions";

const lineSchema = z.object({
  include: z.boolean(),
  quantity: z.string(),
  rate: z.string(),
  taxPct: z.string(),
  deliveryDate: z.string(),
});

const schema = z.object({
  supplierId: z.string().min(1, "Select supplier"),
  currency: z.string().max(3),
  paymentTerms: z.string().max(150),
  incoterms: z.string().max(20),
  destination: z.string().max(200),
  deliveryDate: z.string(),
  lines: z.array(lineSchema),
});
type Values = z.infer<typeof schema>;

export type SupplierOption = { id: string; label: string };
export type PrLineOption = { id: string; material: string; quantity: number; unit: string };

const isPositive = (v: string) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0;

export function PoForm({
  prId,
  suppliers,
  lines,
}: {
  prId: string;
  suppliers: SupplierOption[];
  lines: PrLineOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: "",
      currency: "",
      paymentTerms: "",
      incoterms: "",
      destination: "",
      deliveryDate: "",
      lines: lines.map((l) => ({
        include: true,
        quantity: String(l.quantity),
        rate: "",
        taxPct: "0",
        deliveryDate: "",
      })),
    },
  });

  function onSubmit(values: Values) {
    setServerError("");
    const picked = values.lines
      .map((l, i) => ({ ...l, prLineId: lines[i].id }))
      .filter((l) => l.include);

    if (picked.length === 0) {
      setServerError("Select at least one line");
      return;
    }
    if (picked.some((l) => !isPositive(l.rate))) {
      setServerError("Every selected line needs a rate more than 0");
      return;
    }
    if (picked.some((l) => !isPositive(l.quantity))) {
      setServerError("Every selected line needs a quantity more than 0");
      return;
    }

    start(async () => {
      const { lines: _ignored, ...header } = values;
      void _ignored;
      const res = await createPoAction({
        prId,
        ...header,
        lines: picked.map(({ include: _inc, ...l }) => {
          void _inc;
          return l;
        }),
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/purchase-orders/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Supplier and terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Supplier" htmlFor="supplierId" required error={errors.supplierId?.message}>
            <Select id="supplierId" {...register("supplierId")}>
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Currency" htmlFor="currency" hint="Blank = supplier's currency" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} placeholder="USD" {...register("currency")} />
          </FormField>
          <FormField label="Delivery date" htmlFor="deliveryDate" error={errors.deliveryDate?.message}>
            <Input id="deliveryDate" type="date" {...register("deliveryDate")} />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms" error={errors.paymentTerms?.message}>
            <Input id="paymentTerms" {...register("paymentTerms")} />
          </FormField>
          <FormField label="Incoterms" htmlFor="incoterms" error={errors.incoterms?.message}>
            <Input id="incoterms" placeholder="FOB" {...register("incoterms")} />
          </FormField>
          <FormField label="Destination" htmlFor="destination" error={errors.destination?.message}>
            <Input id="destination" {...register("destination")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-6">
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" {...register(`lines.${i}.include`)} />
                <span>
                  <span className="block font-medium">{l.material}</span>
                  <span className="text-xs text-muted-foreground">
                    PR qty {l.quantity} {l.unit}
                  </span>
                </span>
              </label>
              <FormField label="Qty" htmlFor={`qty-${i}`}>
                <Input id={`qty-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.quantity`)} />
              </FormField>
              <FormField label="Rate" htmlFor={`rate-${i}`}>
                <Input id={`rate-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.rate`)} />
              </FormField>
              <FormField label="Tax %" htmlFor={`tax-${i}`}>
                <Input id={`tax-${i}`} type="number" step="any" min="0" max="100" {...register(`lines.${i}.taxPct`)} />
              </FormField>
              <FormField label="Delivery" htmlFor={`del-${i}`}>
                <Input id={`del-${i}`} type="date" {...register(`lines.${i}.deliveryDate`)} />
              </FormField>
            </div>
          ))}
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Creating..." : "Create purchase order"}</Button>
    </form>
  );
}
