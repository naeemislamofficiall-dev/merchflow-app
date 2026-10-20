"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import {
  closeCartonAction,
  removeCartonAction,
  reopenCartonAction,
  updateCartonAction,
} from "../../actions";

type Measures = {
  grossWeightKg: string;
  netWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

const isOptPos = (v: string) => v === "" || Number(v) > 0;

export function CartonPanel({
  cartonId,
  status,
  initial,
}: {
  cartonId: string;
  status: string;
  initial: Measures;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Measures>({ defaultValues: initial });

  function run(fn: () => Promise<{ ok: boolean }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      if (after) after();
      else router.refresh();
    });
  }

  function save(v: Measures) {
    if (!Object.values(v).every(isOptPos)) {
      setError("Weights and sizes must be more than 0");
      return;
    }
    run(() => updateCartonAction(cartonId, v));
  }

  function remove() {
    if (!window.confirm("Delete this open carton?")) return;
    run(() => removeCartonAction(cartonId), () => router.push("/packing/cartons"));
  }

  if (status === "SHIPPED") return null;

  if (status === "CLOSED") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenCartonAction(cartonId))}>
          Reopen carton
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(save)}>
      <Card>
        <CardHeader>
          <CardTitle>Weight and size</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <FormField label="Gross (kg)" htmlFor="m-gross">
              <Input id="m-gross" type="number" step="any" min="0" {...register("grossWeightKg")} />
            </FormField>
            <FormField label="Net (kg)" htmlFor="m-net">
              <Input id="m-net" type="number" step="any" min="0" {...register("netWeightKg")} />
            </FormField>
            <FormField label="Length (cm)" htmlFor="m-len">
              <Input id="m-len" type="number" step="any" min="0" {...register("lengthCm")} />
            </FormField>
            <FormField label="Width (cm)" htmlFor="m-wid">
              <Input id="m-wid" type="number" step="any" min="0" {...register("widthCm")} />
            </FormField>
            <FormField label="Height (cm)" htmlFor="m-hei">
              <Input id="m-hei" type="number" step="any" min="0" {...register("heightCm")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => closeCartonAction(cartonId))}
            >
              Close carton
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={remove}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}