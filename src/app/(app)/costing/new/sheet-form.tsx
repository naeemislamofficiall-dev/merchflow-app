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
import { FormField } from "@/components/forms/form-field";
import { createCostSheetAction } from "../actions";

const schema = z
  .object({
    styleId: z.string().min(1, "Choose a style"),
    costType: z.enum(["PRE", "POST"]),
    currency: z.string().length(3, "3-letter code like USD"),
    marginPct: z.string().regex(/^([0-9]+(\.[0-9]{1,2})?)?$/, "Number like 15 or 12.5"),
    sourceCostSheetId: z.string(),
    orderId: z.string(),
  })
  .refine((v) => v.marginPct === "" || Number(v.marginPct) < 100, {
    message: "Margin must be below 100",
    path: ["marginPct"],
  })
  .refine((v) => v.costType === "PRE" || (v.sourceCostSheetId !== "" && v.orderId !== ""), {
    message: "Post costing needs the approved estimate and the order",
    path: ["sourceCostSheetId"],
  });
type Values = z.infer<typeof schema>;

type Opt = { id: string; label: string };
type OrderOpt = Opt & { styleIds: string[] };
type EstimateOpt = Opt & { styleId: string };

export function SheetForm({
  defaultStyleId,
  styles,
  orders,
  estimates,
}: {
  defaultStyleId: string;
  styles: Opt[];
  orders: OrderOpt[];
  estimates: EstimateOpt[];
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
      costType: "PRE",
      currency: "USD",
      marginPct: "",
      sourceCostSheetId: "",
      orderId: "",
    },
  });

  const styleId = useWatch({ control, name: "styleId" });
  const costType = useWatch({ control, name: "costType" });
  const styleEstimates = estimates.filter((e) => e.styleId === styleId);
  const styleOrders = orders.filter((o) => o.styleIds.includes(styleId));

  function onStyleChange() {
    setValue("sourceCostSheetId", "");
    setValue("orderId", "");
  }

  function onSubmit(v: Values) {
    setServerError("");
    start(async () => {
      const res = await createCostSheetAction({
        styleId: v.styleId,
        costType: v.costType,
        currency: v.currency.toUpperCase(),
        marginPct: v.marginPct ? Number(v.marginPct) : undefined,
        sourceCostSheetId: v.costType === "POST" ? v.sourceCostSheetId : undefined,
        orderId: v.costType === "POST" ? v.orderId : undefined,
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/costing/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Style" htmlFor="styleId" required error={errors.styleId?.message}>
            <Select id="styleId" {...register("styleId", { onChange: () => onStyleChange() })}>
              <option value="">Select style...</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Type" htmlFor="costType" required>
            <Select id="costType" {...register("costType")}>
              <option value="PRE">Estimate (before the order)</option>
              <option value="POST">Post costing (actual, after the order)</option>
            </Select>
          </FormField>
          <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField
            label="Margin %"
            htmlFor="marginPct"
            error={errors.marginPct?.message}
            hint="Profit as a share of the selling price. You can also set it from a price later."
          >
            <Input id="marginPct" inputMode="decimal" {...register("marginPct")} />
          </FormField>
        </div>

        {costType === "POST" && (
          <div className="grid gap-4 rounded-md border p-3 md:grid-cols-2">
            <FormField label="Approved estimate" htmlFor="sourceCostSheetId" required error={errors.sourceCostSheetId?.message}>
              <Select id="sourceCostSheetId" {...register("sourceCostSheetId")}>
                <option value="">Select estimate...</option>
                {styleEstimates.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Order" htmlFor="orderId" required>
              <Select id="orderId" {...register("orderId")}>
                <option value="">Select order...</option>
                {styleOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {styleId && styleEstimates.length === 0 && (
              <p className="text-xs text-destructive md:col-span-2">
                This style has no approved estimate sheet yet. Approve an estimate first.
              </p>
            )}
          </div>
        )}
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? "Creating..." : "Create cost sheet"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/costing")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}