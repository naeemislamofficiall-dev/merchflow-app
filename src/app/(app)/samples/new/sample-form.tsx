"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createSampleAction } from "../actions";

const TYPES = ["PROTO", "FIT", "SIZE_SET", "SALESMAN", "SMS", "PP", "TOP", "SHIPMENT", "PHOTO", "WASH_TEST"] as const;
const label = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const schema = z.object({
  styleId: z.string().min(1, "Choose a style"),
  sampleType: z.enum(TYPES),
  quantity: z.string().regex(/^[1-9][0-9]*$/, "Whole number above 0"),
  dueDate: z.string(),
  plannedCompletion: z.string(),
  cost: z.string().refine((v) => v === "" || /^[0-9]+(\.[0-9]{1,4})?$/.test(v), "Number like 12.5"),
  orderId: z.string(),
  materialRequirement: z.string().max(1000),
  comments: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

type StyleOpt = { id: string; buyerId: string; label: string };
type OrderOpt = { id: string; buyerId: string; label: string };

export function SampleForm({
  styles,
  orders,
  defaultStyleId,
}: {
  styles: StyleOpt[];
  orders: OrderOpt[];
  defaultStyleId: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      styleId: styles.some((s) => s.id === defaultStyleId) ? defaultStyleId : "",
      sampleType: "PROTO",
      quantity: "1",
      dueDate: "",
      plannedCompletion: "",
      cost: "",
      orderId: "",
      materialRequirement: "",
      comments: "",
    },
  });

  // order শুধু ওই style-এর buyer-এর দেখানো হয়
  const styleId = useWatch({ control, name: "styleId" });
  const buyerId = styles.find((s) => s.id === styleId)?.buyerId;
  const buyerOrders = orders.filter((o) => o.buyerId === buyerId);

  function onSubmit(v: Values) {
    setServerError("");
    start(async () => {
      const res = await createSampleAction({
        styleId: v.styleId,
        sampleType: v.sampleType,
        quantity: Number(v.quantity),
        dueDate: v.dueDate || undefined,
        plannedCompletion: v.plannedCompletion || undefined,
        cost: v.cost ? Number(v.cost) : undefined,
        orderId: v.orderId || undefined,
        materialRequirement: v.materialRequirement || undefined,
        comments: v.comments || undefined,
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/samples/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Style" htmlFor="styleId" required error={errors.styleId?.message}>
            <Select
              id="styleId"
              {...register("styleId", { onChange: () => setValue("orderId", "") })}
            >
              <option value="">Select style...</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Sample type" htmlFor="sampleType" required error={errors.sampleType?.message}>
            <Select id="sampleType" {...register("sampleType")}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {label(t)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity?.message}>
            <Input id="quantity" inputMode="numeric" {...register("quantity")} />
          </FormField>
          <FormField label="Linked order (optional)" htmlFor="orderId" error={errors.orderId?.message}>
            <Select id="orderId" {...register("orderId")} disabled={!styleId}>
              <option value="">{styleId ? "None" : "Choose a style first"}</option>
              {buyerOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </FormField>
          <FormField label="Planned completion" htmlFor="plannedCompletion" error={errors.plannedCompletion?.message}>
            <Input id="plannedCompletion" type="date" {...register("plannedCompletion")} />
          </FormField>
          <FormField label="Estimated cost" htmlFor="cost" error={errors.cost?.message}>
            <Input id="cost" inputMode="decimal" {...register("cost")} />
          </FormField>
        </div>
        <FormField label="Material requirement" htmlFor="materialRequirement" error={errors.materialRequirement?.message}>
          <Textarea id="materialRequirement" {...register("materialRequirement")} />
        </FormField>
        <FormField label="Comments" htmlFor="comments" error={errors.comments?.message}>
          <Textarea id="comments" {...register("comments")} />
        </FormField>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : "Request sample"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/samples")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}