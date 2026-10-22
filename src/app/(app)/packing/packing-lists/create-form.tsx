"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createPackingListAction } from "./actions";

type Values = { shipmentId: string; remarks: string };

export function PackingListCreateForm({ shipments }: { shipments: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({ defaultValues: { shipmentId: "", remarks: "" } });

  function onSubmit(v: Values) {
    setError("");
    if (!v.shipmentId) {
      setError("Select a shipment");
      return;
    }
    start(async () => {
      const res = await createPackingListAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/packing/packing-lists/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>New packing list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Shipment"
              htmlFor="shipmentId"
              required
              hint="Only shipments with cartons and no active packing list are shown"
            >
              <Select id="shipmentId" {...register("shipmentId")}>
                <option value="">Select shipment</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Remarks" htmlFor="remarks">
              <Input id="remarks" maxLength={300} {...register("remarks")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Creating..." : "Create packing list"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
