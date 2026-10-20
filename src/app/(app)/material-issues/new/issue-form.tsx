"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { issueMaterialAction } from "../actions";

export type Option = { id: string; label: string };

type Values = {
  warehouseId: string;
  targetType: string;
  orderId: string;
  overrideReason: string;
  remarks: string;
  lines: { materialId: string; quantity: string }[];
};

const TARGETS = [
  { value: "PRODUCTION_ORDER", label: "Production" },
  { value: "CUTTING_ORDER", label: "Cutting" },
  { value: "SUBCONTRACT", label: "Subcontract" },
];

const isPositive = (v: string) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0;

export function IssueForm({
  warehouses,
  orders,
  materials,
}: {
  warehouses: Option[];
  orders: Option[];
  materials: Option[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      warehouseId: "",
      targetType: "PRODUCTION_ORDER",
      orderId: "",
      overrideReason: "",
      remarks: "",
      lines: [{ materialId: "", quantity: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  function onSubmit(values: Values) {
    setServerError("");
    if (!values.warehouseId) {
      setServerError("Select a warehouse");
      return;
    }
    if (!values.orderId) {
      setServerError("Select the order this material is for");
      return;
    }
    if (values.lines.some((l) => !l.materialId || !isPositive(l.quantity))) {
      setServerError("Every line needs a material and a quantity more than 0");
      return;
    }
    start(async () => {
      const res = await issueMaterialAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/material-issues/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Issue details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="From warehouse" htmlFor="warehouseId" required>
            <Select id="warehouseId" {...register("warehouseId")}>
              <option value="">Select...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Issued for" htmlFor="targetType">
            <Select id="targetType" {...register("targetType")}>
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Order" htmlFor="orderId" required>
            <Select id="orderId" {...register("orderId")}>
              <option value="">Select...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
          <FormField label="Override reason" htmlFor="overrideReason" hint="Only if issuing more than the BOM allows">
            <Input id="overrideReason" maxLength={300} {...register("overrideReason")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Material</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 md:grid-cols-[1fr_160px_auto]">
              <FormField label="Material" htmlFor={`mat-${i}`}>
                <Select id={`mat-${i}`} {...register(`lines.${i}.materialId`)}>
                  <option value="">Select...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Quantity" htmlFor={`qty-${i}`}>
                <Input id={`qty-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.quantity`)} />
              </FormField>
              <Button type="button" variant="outline" size="sm" disabled={fields.length === 1} onClick={() => remove(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: "", quantity: "" })}>
            Add line
          </Button>
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Issuing..." : "Issue material"}</Button>
    </form>
  );
}