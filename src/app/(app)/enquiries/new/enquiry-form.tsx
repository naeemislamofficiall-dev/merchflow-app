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
import { createEnquiryAction } from "../actions";

const schema = z.object({
  buyerId: z.string().min(1, "Choose a buyer"),
  currency: z.string().length(3, "3-letter code like USD"),
  receivedDate: z.string(),
  requiredShipDate: z.string(),
  fabric: z.string().max(200),
  productType: z.string().max(100),
  notes: z.string().max(1000),
  items: z
    .array(
      z.object({
        styleId: z.string(),
        description: z.string().min(1, "Describe the item").max(300),
        quantity: z.string().regex(/^[1-9][0-9]*$/, "Whole number above 0"),
        targetPrice: z.string().regex(/^([0-9]+(\.[0-9]{1,2})?)?$/, "Number like 4.25"),
      })
    )
    .min(1, "Add at least one item"),
});
type Values = z.infer<typeof schema>;

type BuyerOpt = { id: string; label: string; currency: string };
type StyleOpt = { id: string; buyerId: string; name: string; label: string };

const emptyItem = { styleId: "", description: "", quantity: "", targetPrice: "" };

export function EnquiryForm({ buyers, styles }: { buyers: BuyerOpt[]; styles: StyleOpt[] }) {
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
    defaultValues: {
      buyerId: "",
      currency: "USD",
      receivedDate: "",
      requiredShipDate: "",
      fabric: "",
      productType: "",
      notes: "",
      items: [emptyItem],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const buyerId = useWatch({ control, name: "buyerId" });
  const buyerStyles = styles.filter((s) => s.buyerId === buyerId);

  function onBuyerChange(id: string) {
    const b = buyers.find((x) => x.id === id);
    if (b) setValue("currency", b.currency);
    // আগের buyer-এর style নতুন buyer-এ চলে না
    getValues("items").forEach((_, i) => setValue(`items.${i}.styleId`, ""));
  }

  // style বাছলে বিবরণ ফাঁকা থাকলে style-এর নাম বসে যায়
  function onStyleChange(i: number, styleId: string) {
    const st = styles.find((s) => s.id === styleId);
    if (st && !getValues(`items.${i}.description`)) setValue(`items.${i}.description`, st.name);
  }

  function onSubmit(v: Values) {
    setServerError("");
    start(async () => {
      const res = await createEnquiryAction({
        buyerId: v.buyerId,
        currency: v.currency.toUpperCase(),
        receivedDate: v.receivedDate || undefined,
        requiredShipDate: v.requiredShipDate || undefined,
        fabric: v.fabric || undefined,
        productType: v.productType || undefined,
        notes: v.notes || undefined,
        items: v.items.map((it) => ({
          styleId: it.styleId || undefined,
          description: it.description,
          quantity: Number(it.quantity),
          targetPrice: it.targetPrice ? Number(it.targetPrice) : undefined,
        })),
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/enquiries/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Buyer" htmlFor="buyerId" required error={errors.buyerId?.message}>
            <Select id="buyerId" {...register("buyerId", { onChange: (e) => onBuyerChange(e.target.value) })}>
              <option value="">Select buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField label="Received date" htmlFor="receivedDate" error={errors.receivedDate?.message}>
            <Input id="receivedDate" type="date" {...register("receivedDate")} />
          </FormField>
          <FormField label="Required ship date" htmlFor="requiredShipDate" error={errors.requiredShipDate?.message}>
            <Input id="requiredShipDate" type="date" {...register("requiredShipDate")} />
          </FormField>
          <FormField label="Product type" htmlFor="productType" error={errors.productType?.message}>
            <Input id="productType" placeholder="e.g. Polo shirt" {...register("productType")} />
          </FormField>
          <FormField label="Fabric" htmlFor="fabric" error={errors.fabric?.message}>
            <Input id="fabric" placeholder="e.g. 180 GSM single jersey" {...register("fabric")} />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <Textarea id="notes" {...register("notes")} />
        </FormField>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Items</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem)}>
            Add item
          </Button>
        </div>
        {!buyerId && <p className="text-xs text-muted-foreground">Choose a buyer first to see its styles.</p>}

        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.5fr_2fr_1fr_1fr_auto]">
            <FormField label="Style (optional)" htmlFor={`i-style-${i}`} error={errors.items?.[i]?.styleId?.message}>
              <Select
                id={`i-style-${i}`}
                {...register(`items.${i}.styleId`, { onChange: (e) => onStyleChange(i, e.target.value) })}
              >
                <option value="">No style yet</option>
                {buyerStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Description" htmlFor={`i-desc-${i}`} error={errors.items?.[i]?.description?.message}>
              <Input id={`i-desc-${i}`} {...register(`items.${i}.description`)} />
            </FormField>
            <FormField label="Quantity" htmlFor={`i-qty-${i}`} error={errors.items?.[i]?.quantity?.message}>
              <Input id={`i-qty-${i}`} inputMode="numeric" {...register(`items.${i}.quantity`)} />
            </FormField>
            <FormField label="Target price" htmlFor={`i-price-${i}`} error={errors.items?.[i]?.targetPrice?.message}>
              <Input id={`i-price-${i}`} inputMode="decimal" {...register(`items.${i}.targetPrice`)} />
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
        {errors.items?.message && <p className="text-xs text-destructive">{errors.items.message}</p>}
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? "Saving..." : "Create enquiry"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/enquiries")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}