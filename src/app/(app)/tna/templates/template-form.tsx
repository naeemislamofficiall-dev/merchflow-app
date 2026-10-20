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
import { FormField } from "@/components/forms/form-field";
import { createTnaTemplateAction } from "../actions";

const schema = z.object({
  name: z.string().min(1, "Give the template a name").max(100),
  tasks: z
    .array(
      z.object({
        name: z.string().min(1, "Milestone name is required").max(100),
        daysBefore: z.string().regex(/^[0-9]+$/, "Whole number of days"),
        dependsOn: z.string(),
      })
    )
    .min(1, "Add at least one milestone"),
});
type Values = z.infer<typeof schema>;

const emptyTask = { name: "", daysBefore: "", dependsOn: "" };

export function TemplateForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", tasks: [emptyTask] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "tasks" });

  function onSubmit(v: Values) {
    setServerError("");
    // নির্ভরতা শুধু আগের কোনো milestone-এর ওপর হতে পারে (নইলে চক্র তৈরি হয়)
    for (let i = 0; i < v.tasks.length; i++) {
      const dep = v.tasks[i].dependsOn;
      if (dep !== "" && Number(dep) >= i) {
        setServerError(`Milestone ${i + 1} can only depend on an earlier milestone`);
        return;
      }
    }
    start(async () => {
      const res = await createTnaTemplateAction({
        name: v.name.trim(),
        tasks: v.tasks.map((t, i) => ({
          name: t.name.trim(),
          daysBefore: Number(t.daysBefore),
          sortOrder: i,
          dependsOnSortOrder: t.dependsOn === "" ? undefined : Number(t.dependsOn),
        })),
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      reset({ name: "", tasks: [emptyTask] });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="space-y-4 p-4">
        <h2 className="text-base font-semibold">New template</h2>
        <FormField label="Template name" htmlFor="tpl-name" required error={errors.name?.message}>
          <Input id="tpl-name" placeholder="e.g. Woven shirt - standard" {...register("name")} />
        </FormField>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Milestones (in order)</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyTask)}>
            Add milestone
          </Button>
        </div>

        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[auto_2fr_1fr_1.5fr_auto]">
            <div className="flex items-end pb-2 text-sm font-medium text-muted-foreground">{i + 1}</div>
            <FormField label="Milestone" htmlFor={`t-name-${i}`} error={errors.tasks?.[i]?.name?.message}>
              <Input id={`t-name-${i}`} placeholder="e.g. Fabric in-house" {...register(`tasks.${i}.name`)} />
            </FormField>
            <FormField
              label="Days before ship"
              htmlFor={`t-days-${i}`}
              error={errors.tasks?.[i]?.daysBefore?.message}
            >
              <Input id={`t-days-${i}`} inputMode="numeric" {...register(`tasks.${i}.daysBefore`)} />
            </FormField>
            <FormField label="Depends on" htmlFor={`t-dep-${i}`}>
              <Select id={`t-dep-${i}`} {...register(`tasks.${i}.dependsOn`)}>
                <option value="">Nothing</option>
                {fields.slice(0, i).map((_, j) => (
                  <option key={j} value={String(j)}>
                    Milestone {j + 1}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(i)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {errors.tasks?.message && <p className="text-xs text-destructive">{errors.tasks.message}</p>}
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Save template"}</Button>
    </form>
  );
}