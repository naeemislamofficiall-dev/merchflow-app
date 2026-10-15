"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createOrderAction } from "../actions";

const schema = z.object({
  buyerId: z.string().min(1, "Choose a buyer"),
  buyerPoNo: z.string().max(60),
  currency: z.string().length(3, "3-letter code like USD"),
  shipDate: z.string(),
  notes: z.string().max(1000),
  lines: z
    .array(
      z.object({
        styleId: z.string().min(1, "Choose a style"),
        quantity: z.string().regex(/^[1-9][0-9]*$/, "Whole number above 0"),
        unitPrice: z.string().regex(/^[0-9]+(\.[0-9]{1,4})?$/, "Number like 4.25"),
        shipDate: z.string(),
      })
    )
    .min(1, "Add at least one line"),
});
type Values = z.infer<typeof schema>;

type BuyerOpt = { id: string; label: string; currency: string };
type StyleOpt = { id: string; buyerId: string; label: string };

const emptyLine = { styleId: "", quantity: "", unitPrice: "", shipDate: "" };

export function OrderForm({ buyers, styles }: { buyers: BuyerOpt[]; styles: StyleOpt[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { buyerId: "", buyerPoNo: "", currency: "USD", shipDate: "", notes: "", lines: [emptyLine] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const buyerId = useWatch({ control, name: "buyerId" });
  const buyerStyles = styles.filter((s) => s.buyerId === buyerId);

  function onBuyerChange(id: string) {
    const b = buyers.find((x) => x.id === id);
    if (b) setValue("currency", b.currency);
    // আগের buyer-এর style নতুন buyer-এ চলে না
    getValues("lines").forEach((_, i) => setValue(`lines.${i}.styleId`, ""));
  }

  function onSubmit(v: Values) {
    setServerError("");
    start(async () => {
      const res = await createOrderAction({
        buyerId: v.buyerId,
        buyerPoNo: v.buyerPoNo || undefined,
        currency: v.currency.toUpperCase(),
        shipDate: v.shipDate || undefined,
        notes: v.notes || undefined,
        lines: v.lines.map((l) => ({
          styleId: l.styleId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          shipDate: l.shipDate || undefined,
        })),
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/orders/${res.data.id}?tab=matrix`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Buyer" htmlFor="buyerId" required error={errors.buyerId?.message}>
            <Select
              id="buyerId"
              {...register("buyerId", { onChange: (e) => onBuyerChange(e.target.value) })}
            >
              <option value="">Select buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Buyer PO no" htmlFor="buyerPoNo" error={errors.buyerPoNo?.message}>
            <Input id="buyerPoNo" {...register("buyerPoNo")} />
          </FormField>
          <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField label="Ship date" htmlFor="shipDate" error={errors.shipDate?.message}>
            <Input id="shipDate" type="date" {...register("shipDate")} />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <Textarea id="notes" {...register("notes")} />
        </FormField>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Order lines</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
            Add line
          </Button>
        </div>
        {!buyerId && <p className="text-xs text-muted-foreground">Choose a buyer first to see its styles.</p>}
        {buyerId && buyerStyles.length === 0 && (
          <p className="text-xs text-destructive">This buyer has no open styles. Create a style first.</p>
        )}

        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <FormField label="Style" htmlFor={`l-style-${i}`} error={errors.lines?.[i]?.styleId?.message}>
              <Select id={`l-style-${i}`} {...register(`lines.${i}.styleId`)}>
                <option value="">Select style...</option>
                {buyerStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity" htmlFor={`l-qty-${i}`} error={errors.lines?.[i]?.quantity?.message}>
              <Input id={`l-qty-${i}`} inputMode="numeric" {...register(`lines.${i}.quantity`)} />
            </FormField>
            <FormField label="Unit price" htmlFor={`l-price-${i}`} error={errors.lines?.[i]?.unitPrice?.message}>
              <Input id={`l-price-${i}`} inputMode="decimal" {...register(`lines.${i}.unitPrice`)} />
            </FormField>
            <FormField label="Line ship date" htmlFor={`l-date-${i}`} error={errors.lines?.[i]?.shipDate?.message}>
              <Input id={`l-date-${i}`} type="date" {...register(`lines.${i}.shipDate`)} />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(i)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {errors.lines?.message && <p className="text-xs text-destructive">{errors.lines.message}</p>}
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? "Saving..." : "Create order"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/orders")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}