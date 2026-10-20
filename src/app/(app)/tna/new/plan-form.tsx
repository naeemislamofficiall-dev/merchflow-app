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
import { generateTnaPlanAction } from "../actions";

const schema = z
  .object({
    orderId: z.string(),
    styleId: z.string().min(1, "Choose a style"),
    templateId: z.string().min(1, "Choose a template"),
    shipDate: z.string(),
  })
  .refine((v) => v.orderId !== "" || v.shipDate !== "", {
    message: "Choose an order or enter a ship date",
    path: ["shipDate"],
  });
type Values = z.infer<typeof schema>;

type Opt = { id: string; label: string };
type OrderOpt = Opt & { shipDate: string; styleIds: string[] };

export function PlanForm({
  templates,
  styles,
  orders,
}: {
  templates: Opt[];
  styles: Opt[];
  orders: OrderOpt[];
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
    defaultValues: { orderId: "", styleId: "", templateId: "", shipDate: "" },
  });

  const orderId = useWatch({ control, name: "orderId" });
  const order = orders.find((o) => o.id === orderId);
  // অর্ডার বাছলে শুধু ওই অর্ডারের style দেখায়
  const visibleStyles = order ? styles.filter((s) => order.styleIds.includes(s.id)) : styles;

  function onOrderChange(id: string) {
    const o = orders.find((x) => x.id === id);
    setValue("styleId", o && o.styleIds.length === 1 ? o.styleIds[0] : "");
  }

  function onSubmit(v: Values) {
    setServerError("");
    start(async () => {
      const res = await generateTnaPlanAction({
        styleId: v.styleId,
        templateId: v.templateId,
        orderId: v.orderId || undefined,
        shipDate: v.shipDate || undefined,
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/tna/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Order (optional)" htmlFor="orderId" hint="Its ship date is used if you leave the date empty">
            <Select id="orderId" {...register("orderId", { onChange: (e) => onOrderChange(e.target.value) })}>
              <option value="">No order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Style" htmlFor="styleId" required error={errors.styleId?.message}>
            <Select id="styleId" {...register("styleId")}>
              <option value="">Select style...</option>
              {visibleStyles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Template" htmlFor="templateId" required error={errors.templateId?.message}>
            <Select id="templateId" {...register("templateId")}>
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Ship date"
            htmlFor="shipDate"
            error={errors.shipDate?.message}
            hint={order?.shipDate ? `Order ship date: ${order.shipDate}` : undefined}
          >
            <Input id="shipDate" type="date" {...register("shipDate")} />
          </FormField>
        </div>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button disabled={pending}>{pending ? "Generating..." : "Generate plan"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/tna")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}