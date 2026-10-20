"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { inspectRollAction } from "./actions";

type Values = {
  method: string;
  widthCm: string;
  gsm: string;
  length: string;
  defectPoints: string;
  shade: string;
  shrinkagePct: string;
  result: string;
  remarks: string;
};

const isOptPos = (v: string) => v === "" || Number(v) > 0;

export function InspectionForm({ rollNo }: { rollNo: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: {
      method: "4-point",
      widthCm: "",
      gsm: "",
      length: "",
      defectPoints: "",
      shade: "",
      shrinkagePct: "",
      result: "ACCEPTED",
      remarks: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!isOptPos(v.widthCm) || !isOptPos(v.gsm) || !isOptPos(v.length)) {
      setError("Width, GSM and length must be more than 0");
      return;
    }
    if (v.defectPoints !== "" && (!Number.isInteger(Number(v.defectPoints)) || Number(v.defectPoints) < 0)) {
      setError("Defect points must be a whole number, 0 or more");
      return;
    }
    if (v.result !== "ACCEPTED" && v.remarks.trim().length < 3) {
      setError("Write the reason in remarks for a conditional or rejected roll");
      return;
    }
    start(async () => {
      const res = await inspectRollAction({ ...v, rollNo });
      if (!res.ok) {
        setError(res.error);
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
          <CardTitle>Inspect this roll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Result" htmlFor="fi-result" required>
              <Select id="fi-result" {...register("result")}>
                <option value="ACCEPTED">Accepted</option>
                <option value="CONDITIONAL">Conditional</option>
                <option value="REJECTED">Rejected</option>
              </Select>
            </FormField>
            <FormField label="Method" htmlFor="fi-method">
              <Input id="fi-method" maxLength={50} {...register("method")} />
            </FormField>
            <FormField label="Defect points" htmlFor="fi-points">
              <Input id="fi-points" type="number" step="1" min="0" {...register("defectPoints")} />
            </FormField>
            <FormField label="Shade" htmlFor="fi-shade">
              <Input id="fi-shade" maxLength={50} {...register("shade")} />
            </FormField>
            <FormField label="Width (cm)" htmlFor="fi-width">
              <Input id="fi-width" type="number" step="any" min="0" {...register("widthCm")} />
            </FormField>
            <FormField label="GSM" htmlFor="fi-gsm">
              <Input id="fi-gsm" type="number" step="any" min="0" {...register("gsm")} />
            </FormField>
            <FormField label="Length" htmlFor="fi-length">
              <Input id="fi-length" type="number" step="any" min="0" {...register("length")} />
            </FormField>
            <FormField label="Shrinkage %" htmlFor="fi-shrink" hint="Use a minus sign for stretch">
              <Input id="fi-shrink" type="number" step="any" min="-50" max="50" {...register("shrinkagePct")} />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="fi-remarks" hint="Required if not accepted">
            <Input id="fi-remarks" maxLength={500} {...register("remarks")} />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save inspection"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}