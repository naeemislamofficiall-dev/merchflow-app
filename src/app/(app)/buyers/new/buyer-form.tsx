"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createBuyerAction } from "../actions";

// ব্রাউজারের দ্রুত যাচাই। আসল যাচাই সার্ভারের সার্ভিসে হয়।
const schema = z.object({
  code: z.string().min(1, "Required").max(20),
  name: z.string().min(1, "Required").max(150),
  country: z.string().max(80),
  region: z.string().max(80),
  currency: z.string().refine((v) => v === "" || v.length === 3, "Use a 3-letter code like USD"),
  paymentTerms: z.string().max(150),
  shipmentTerms: z.string().max(150),
  category: z.string().max(80),
  address: z.string().max(300),
  complianceNotes: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

export function BuyerForm() {
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
      code: "", name: "", country: "", region: "", currency: "USD", paymentTerms: "",
      shipmentTerms: "", category: "", address: "", complianceNotes: "",
    },
  });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await createBuyerAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/buyers/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Code" htmlFor="code" required error={errors.code?.message}>
            <Input id="code" {...register("code")} />
          </FormField>
          <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Country" htmlFor="country" error={errors.country?.message}>
            <Input id="country" {...register("country")} />
          </FormField>
          <FormField label="Region" htmlFor="region" error={errors.region?.message}>
            <Input id="region" {...register("region")} />
          </FormField>
          <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField label="Category" htmlFor="category" error={errors.category?.message}>
            <Input id="category" {...register("category")} />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms" error={errors.paymentTerms?.message}>
            <Input id="paymentTerms" {...register("paymentTerms")} />
          </FormField>
          <FormField label="Shipment terms" htmlFor="shipmentTerms" error={errors.shipmentTerms?.message}>
            <Input id="shipmentTerms" {...register("shipmentTerms")} />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="address" error={errors.address?.message}>
          <Input id="address" {...register("address")} />
        </FormField>
        <FormField label="Compliance notes" htmlFor="complianceNotes" error={errors.complianceNotes?.message}>
          <Textarea id="complianceNotes" {...register("complianceNotes")} />
        </FormField>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : "Save buyer"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/buyers")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}