"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createStockCountAction } from "./actions";

type Values = { warehouseId: string; remarks: string };

export function CountCreateForm({ warehouses }: { warehouses: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: { warehouseId: "", remarks: "" },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.warehouseId) {
      setError("Select a warehouse");
      return;
    }
    start(async () => {
      const res = await createStockCountAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/stock-counts/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>New stock count</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Warehouse" htmlFor="warehouseId" required>
              <Select id="warehouseId" {...register("warehouseId")}>
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Remarks" htmlFor="remarks">
              <Input id="remarks" maxLength={300} {...register("remarks")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Creating..." : "Create count"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
