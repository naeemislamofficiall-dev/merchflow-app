"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createCutPlanAction } from "../actions";

type Values = {
  color: string;
  materialId: string;
  plannedPlies: string;
  fabricRequirement: string;
  remarks: string;
  ratio: string[]; // sizes-এর ক্রমে
};

export function CutPlanForm({
  productionOrderId,
  colors,
  sizes,
  materials,
}: {
  productionOrderId: string;
  colors: string[];
  sizes: string[];
  materials: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      color: "",
      materialId: "",
      plannedPlies: "",
      fabricRequirement: "",
      remarks: "",
      ratio: sizes.map(() => ""),
    },
  });

  const ratio = useWatch({ control, name: "ratio" }) ?? [];
  const plies = Number(useWatch({ control, name: "plannedPlies" }));
  const ratioSum = ratio.reduce((s, v) => s + (Number(v) > 0 ? Number(v) : 0), 0);
  const output = Number.isFinite(plies) && plies > 0 ? plies * ratioSum : 0;

  function onSubmit(v: Values) {
    setServerError("");
    if (!v.color || !v.materialId) {
      setServerError("Color and fabric are required");
      return;
    }
    if (ratioSum <= 0) {
      setServerError("Enter a size ratio for at least one size");
      return;
    }
    if (!Number.isInteger(plies) || plies <= 0) {
      setServerError("Planned plies must be a whole number more than 0");
      return;
    }
    const sizeRatio: Record<string, string> = {};
    sizes.forEach((s, i) => {
      sizeRatio[s] = v.ratio[i] ?? "";
    });
    start(async () => {
      const res = await createCutPlanAction({
        productionOrderId,
        color: v.color,
        materialId: v.materialId,
        sizeRatio,
        plannedPlies: v.plannedPlies,
        fabricRequirement: v.fabricRequirement,
        remarks: v.remarks,
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/cutting/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Color and fabric</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Color" htmlFor="color" required>
            <Select id="color" {...register("color")}>
              <option value="">Select...</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Fabric" htmlFor="materialId" required>
            <Select id="materialId" {...register("materialId")}>
              <option value="">Select...</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Fabric requirement"
            htmlFor="fabricRequirement"
            hint="Blank = calculated from the approved BOM"
          >
            <Input id="fabricRequirement" type="number" step="any" min="0" {...register("fabricRequirement")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Size ratio and plies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {sizes.map((s, i) => (
              <FormField key={s} label={`Size ${s}`} htmlFor={`ratio-${i}`}>
                <Input id={`ratio-${i}`} type="number" step="1" min="0" {...register(`ratio.${i}`)} />
              </FormField>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Planned plies" htmlFor="plannedPlies" required>
              <Input id="plannedPlies" type="number" step="1" min="1" {...register("plannedPlies")} />
            </FormField>
            <FormField label="Remarks" htmlFor="remarks">
              <Input id="remarks" maxLength={500} {...register("remarks")} />
            </FormField>
            <div className="flex items-end text-sm text-muted-foreground">
              Planned output: <span className="ml-1 font-medium text-foreground">{output} pcs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create cut plan"}</Button>
    </form>
  );
}