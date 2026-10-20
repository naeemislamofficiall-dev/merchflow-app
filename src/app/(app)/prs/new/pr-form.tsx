"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createPrAction } from "../actions";

const schema = z.object({
  source: z.string().min(1),
  priority: z.string().min(1),
  requiredDate: z.string(),
  reason: z.string().max(500),
  lines: z
    .array(
      z.object({
        materialId: z.string().min(1, "Select material"),
        quantity: z.string().refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, "More than 0"),
        remarks: z.string().max(300),
      })
    )
    .min(1, "Add at least one line"),
});
type Values = z.infer<typeof schema>;

export type MaterialOption = { id: string; label: string };

export function PrForm({ materials }: { materials: MaterialOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "MANUAL",
      priority: "NORMAL",
      requiredDate: "",
      reason: "",
      lines: [{ materialId: "", quantity: "", remarks: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await createPrAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/prs/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Source" htmlFor="source" required error={errors.source?.message}>
            <Select id="source" {...register("source")}>
              <option value="MANUAL">Manual</option>
              <option value="PRODUCTION_PLAN">Production plan</option>
            </Select>
          </FormField>
          <FormField label="Priority" htmlFor="priority" required error={errors.priority?.message}>
            <Select id="priority" {...register("priority")}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </FormField>
          <FormField label="Required by" htmlFor="requiredDate" error={errors.requiredDate?.message}>
            <Input id="requiredDate" type="date" {...register("requiredDate")} />
          </FormField>
        </div>
        <FormField label="Reason" htmlFor="reason" error={errors.reason?.message}>
          <Textarea id="reason" {...register("reason")} />
        </FormField>

        <div className="space-y-3">
          <p className="text-sm font-medium">Lines</p>
          {fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr_1fr_2fr_auto] md:items-end">
              <FormField
                label="Material"
                htmlFor={`l-material-${i}`}
                required
                error={errors.lines?.[i]?.materialId?.message}
              >
                <Select id={`l-material-${i}`} {...register(`lines.${i}.materialId`)}>
                  <option value="">Select material...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Quantity"
                htmlFor={`l-qty-${i}`}
                required
                error={errors.lines?.[i]?.quantity?.message}
              >
                <Input id={`l-qty-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.quantity`)} />
              </FormField>
              <FormField label="Remarks" htmlFor={`l-remarks-${i}`} error={errors.lines?.[i]?.remarks?.message}>
                <Input id={`l-remarks-${i}`} {...register(`lines.${i}.remarks`)} />
              </FormField>
              <Button type="button" variant="outline" disabled={fields.length === 1} onClick={() => remove(i)}>
                Remove
              </Button>
            </div>
          ))}
          {errors.lines?.message && <p className="text-xs text-destructive">{errors.lines.message}</p>}
          <Button type="button" variant="outline" onClick={() => append({ materialId: "", quantity: "", remarks: "" })}>
            Add line
          </Button>
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : "Save PR"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/prs")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}