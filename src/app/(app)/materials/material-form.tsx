"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createMaterialAction, updateMaterialAction } from "./actions";

const UNITS = ["PCS", "MTR", "YDS", "KG", "LBS", "CONE", "ROLL", "SET", "GROSS", "DOZEN", "BOX"];

const schema = z.object({
  categoryId: z.string().min(1, "Required"),
  code: z.string().min(1, "Required").max(30),
  name: z.string().min(1, "Required").max(150),
  unit: z.string().min(1, "Required").max(10),
  reorderPoint: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Must be 0 or more"),
  description: z.string().max(500),
});
type Values = z.infer<typeof schema>;

// id থাকলে edit মোড, না থাকলে create মোড
export function MaterialForm({
  categories,
  id,
  initial,
}: {
  categories: { id: string; label: string }[];
  id?: string;
  initial?: Values;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();
  const editing = Boolean(id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { categoryId: "", code: "", name: "", unit: "PCS", reorderPoint: "", description: "" },
  });

  const units = initial && !UNITS.includes(initial.unit) ? [initial.unit, ...UNITS] : UNITS;

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = id ? await updateMaterialAction(id, values) : await createMaterialAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/materials/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Category" htmlFor="categoryId" required error={errors.categoryId?.message}>
            <Select id="categoryId" {...register("categoryId")}>
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Code"
            htmlFor="code"
            required
            error={errors.code?.message}
            hint={editing ? "Code cannot be changed" : undefined}
          >
            <Input id="code" readOnly={editing} {...register("code")} />
          </FormField>
          <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Unit" htmlFor="unit" required error={errors.unit?.message}>
            <Select id="unit" {...register("unit")}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Reorder point" htmlFor="reorderPoint" error={errors.reorderPoint?.message}>
            <Input id="reorderPoint" type="number" step="any" min="0" {...register("reorderPoint")} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" {...register("description")} />
        </FormField>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : editing ? "Save changes" : "Save material"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(id ? `/materials/${id}` : "/materials")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}