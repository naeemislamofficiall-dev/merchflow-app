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
import { addBomItemAction } from "../actions";

const TYPES = ["FABRIC", "YARN", "TRIM", "PACKING"];
const UNITS = ["PCS", "MTR", "YDS", "KG", "LBS", "CONE", "ROLL", "SET", "GROSS", "DOZEN", "BOX"];

const num = (v: string) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0);

const schema = z.object({
  itemType: z.string().min(1, "Required"),
  materialId: z.string(),
  itemName: z.string().min(1, "Required").max(150),
  subCategory: z.string().max(60),
  supplierId: z.string(),
  unit: z.string().min(1, "Required"),
  consumption: z.string().refine((v) => v !== "" && num(v) && Number(v) > 0, "Must be more than 0"),
  wastagePct: z.string().refine((v) => num(v) && (v === "" || Number(v) <= 100), "0 to 100"),
  rate: z.string().refine(num, "Must be 0 or more"),
  currency: z.string().refine((v) => v === "" || v.length === 3, "3-letter code"),
});
type Values = z.infer<typeof schema>;

export type MaterialOption = { id: string; label: string; name: string; unit: string };
export type SupplierOption = { id: string; label: string };

export function ItemForm({
  bomId,
  materials,
  suppliers,
}: {
  bomId: string;
  materials: MaterialOption[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemType: "FABRIC", materialId: "", itemName: "", subCategory: "", supplierId: "",
      unit: "PCS", consumption: "", wastagePct: "0", rate: "", currency: "USD",
    },
  });

  // material বাছলে নাম আর unit নিজে থেকে ভরে যায় (নাম ফাঁকা থাকলেই)
  function onMaterialChange(id: string) {
    const m = materials.find((x) => x.id === id);
    if (!m) return;
    if (!getValues("itemName")) setValue("itemName", m.name, { shouldValidate: true });
    setValue("unit", UNITS.includes(m.unit) ? m.unit : getValues("unit"));
  }

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await addBomItemAction(bomId, values);
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
          <CardTitle>Add item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Type" htmlFor="itemType" required error={errors.itemType?.message}>
              <Select id="itemType" {...register("itemType")}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Material" htmlFor="materialId" error={errors.materialId?.message}>
              <Select
                id="materialId"
                {...register("materialId", { onChange: (e) => onMaterialChange(e.target.value) })}
              >
                <option value="">No material (free text)</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Item name" htmlFor="itemName" required error={errors.itemName?.message}>
              <Input id="itemName" {...register("itemName")} />
            </FormField>
            <FormField
              label="Sub-category"
              htmlFor="subCategory"
              error={errors.subCategory?.message}
              hint="Thread, Button, Zipper, Label, Poly, Carton..."
            >
              <Input id="subCategory" {...register("subCategory")} />
            </FormField>
            <FormField label="Supplier" htmlFor="supplierId" error={errors.supplierId?.message}>
              <Select id="supplierId" {...register("supplierId")}>
                <option value="">No supplier yet</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unit" htmlFor="unit" required error={errors.unit?.message}>
              <Select id="unit" {...register("unit")}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Consumption per piece"
              htmlFor="consumption"
              required
              error={errors.consumption?.message}
            >
              <Input id="consumption" type="number" step="any" min="0" {...register("consumption")} />
            </FormField>
            <FormField label="Wastage %" htmlFor="wastagePct" error={errors.wastagePct?.message}>
              <Input id="wastagePct" type="number" step="any" min="0" max="100" {...register("wastagePct")} />
            </FormField>
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <FormField label="Rate" htmlFor="rate" error={errors.rate?.message}>
                <Input id="rate" type="number" step="any" min="0" {...register("rate")} />
              </FormField>
              <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
                <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
              </FormField>
            </div>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button disabled={pending}>{pending ? "Adding..." : "Add item"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}