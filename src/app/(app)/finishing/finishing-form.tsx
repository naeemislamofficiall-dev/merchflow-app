"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { saveFinishingAction } from "./actions";

type Values = {
  logDate: string;
  inputQty: string;
  threadCutQty: string;
  ironedQty: string;
  foldedQty: string;
  metalCheckedQty: string;
  qcPassedQty: string;
  reworkQty: string;
  outputQty: string;
  remarks: string;
};

const COUNTS: { name: keyof Values; label: string }[] = [
  { name: "inputQty", label: "Received from sewing" },
  { name: "threadCutQty", label: "Thread cut" },
  { name: "ironedQty", label: "Ironed" },
  { name: "foldedQty", label: "Folded" },
  { name: "metalCheckedQty", label: "Metal checked" },
  { name: "qcPassedQty", label: "QC passed" },
  { name: "reworkQty", label: "Rework" },
  { name: "outputQty", label: "Finished (output)" },
];

const isOptCount = (v: string) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);

export function FinishingForm({ productionOrderId, date }: { productionOrderId: string; date: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: {
      logDate: date,
      inputQty: "",
      threadCutQty: "",
      ironedQty: "",
      foldedQty: "",
      metalCheckedQty: "",
      qcPassedQty: "",
      reworkQty: "",
      outputQty: "",
      remarks: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    setSaved("");
    if (!v.logDate) {
      setError("Select the date");
      return;
    }
    if (COUNTS.some((c) => !isOptCount(v[c.name]))) {
      setError("Every quantity must be a whole number, 0 or more");
      return;
    }
    start(async () => {
      const res = await saveFinishingAction({ ...v, productionOrderId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(`Saved for ${v.logDate}`);
      reset({ ...v, inputQty: "", threadCutQty: "", ironedQty: "", foldedQty: "", metalCheckedQty: "", qcPassedQty: "", reworkQty: "", outputQty: "", remarks: "" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Record a day</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Blank means 0. Saving the same date again replaces that day, so enter the full numbers for the day.
          </p>
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Date" htmlFor="logDate" required>
              <Input id="logDate" type="date" {...register("logDate")} />
            </FormField>
            {COUNTS.map((c) => (
              <FormField key={c.name} label={c.label} htmlFor={c.name}>
                <Input id={c.name} type="number" step="1" min="0" {...register(c.name)} />
              </FormField>
            ))}
            <FormField label="Remarks" htmlFor="remarks">
              <Input id="remarks" maxLength={500} {...register("remarks")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-muted-foreground">{saved}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save day"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}