"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { saveBulletinAction } from "./actions";

type Op = { name: string; machineType: string; smv: string; skillLevel: string; operators: string };
type Values = { operations: Op[] };

export function BulletinForm({ styleId, initial }: { styleId: string; initial: Op[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      operations: initial.length > 0 ? initial : [{ name: "", machineType: "", smv: "", skillLevel: "", operators: "1" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "operations" });

  function onSubmit(v: Values) {
    setError("");
    setSaved("");
    if (v.operations.length === 0) {
      setError("Add at least one operation");
      return;
    }
    for (const [i, o] of v.operations.entries()) {
      if (!o.name.trim()) {
        setError(`Operation ${i + 1} needs a name`);
        return;
      }
      if (!(Number(o.smv) > 0) || Number(o.smv) > 999) {
        setError(`Operation ${i + 1}: SMV must be more than 0 and not more than 999`);
        return;
      }
      if (o.operators !== "" && (!(Number(o.operators) > 0) || Number(o.operators) > 99)) {
        setError(`Operation ${i + 1}: operators must be more than 0 and not more than 99`);
        return;
      }
    }
    start(async () => {
      const res = await saveBulletinAction(styleId, v.operations);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(`Saved. Total SMV is ${res.data.totalSmv}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Edit operation bulletin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Saving replaces the whole list. Operations keep the order you see here. SMV is minutes for one piece.
          </p>
          {fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[40px_1.6fr_1fr_100px_1fr_100px_auto]">
              <span className="pb-2 text-sm text-muted-foreground">{i + 1}</span>
              <FormField label="Operation" htmlFor={`op-name-${i}`}>
                <Input id={`op-name-${i}`} maxLength={100} {...register(`operations.${i}.name`)} />
              </FormField>
              <FormField label="Machine" htmlFor={`op-machine-${i}`}>
                <Input id={`op-machine-${i}`} maxLength={60} {...register(`operations.${i}.machineType`)} />
              </FormField>
              <FormField label="SMV" htmlFor={`op-smv-${i}`}>
                <Input id={`op-smv-${i}`} type="number" step="any" min="0" {...register(`operations.${i}.smv`)} />
              </FormField>
              <FormField label="Skill" htmlFor={`op-skill-${i}`}>
                <Input id={`op-skill-${i}`} maxLength={40} {...register(`operations.${i}.skillLevel`)} />
              </FormField>
              <FormField label="Operators" htmlFor={`op-ops-${i}`}>
                <Input id={`op-ops-${i}`} type="number" step="any" min="0" {...register(`operations.${i}.operators`)} />
              </FormField>
              <Button type="button" variant="outline" size="sm" disabled={fields.length === 1} onClick={() => remove(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", machineType: "", smv: "", skillLevel: "", operators: "1" })}
          >
            Add operation
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-muted-foreground">{saved}</p>}
          <div>
            <Button disabled={pending}>{pending ? "Saving..." : "Save bulletin"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}