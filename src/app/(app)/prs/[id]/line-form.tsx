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
import { addPrLineAction } from "../actions";

const schema = z.object({
  materialId: z.string().min(1, "Select material"),
  quantity: z.string().refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, "More than 0"),
  remarks: z.string().max(300),
});
type Values = z.infer<typeof schema>;

export type MaterialOption = { id: string; label: string };

export function LineForm({ prId, materials }: { prId: string; materials: MaterialOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { materialId: "", quantity: "", remarks: "" },
  });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await addPrLineAction(prId, values);
      if (!res.ok) {
        setServerError(res.error);
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
          <CardTitle>Add line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Material" htmlFor="materialId" required error={errors.materialId?.message}>
              <Select id="materialId" {...register("materialId")}>
                <option value="">Select material...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity" htmlFor="quantity" required error={errors.quantity?.message}>
              <Input id="quantity" type="number" step="any" min="0" {...register("quantity")} />
            </FormField>
            <FormField label="Remarks" htmlFor="remarks" error={errors.remarks?.message}>
              <Input id="remarks" {...register("remarks")} />
            </FormField>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button disabled={pending}>{pending ? "Adding..." : "Add line"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}