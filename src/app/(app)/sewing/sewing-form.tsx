"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { saveSewingLogAction } from "./actions";

type Option = { id: string; label: string };

type Values = {
  productionOrderId: string;
  hour: string;
  target: string;
  output: string;
  reject: string;
  rework: string;
  downtimeMinutes: string;
  downtimeReason: string;
  operators: string;
  remarks: string;
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const isCount = (v: string) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0;
const isOptCount = (v: string) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);

export function SewingForm({
  lineId,
  date,
  orders,
}: {
  lineId: string;
  date: string;
  orders: Option[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, reset, getValues } = useForm<Values>({
    defaultValues: {
      productionOrderId: orders.length === 1 ? orders[0].id : "",
      hour: "",
      target: "",
      output: "",
      reject: "0",
      rework: "0",
      downtimeMinutes: "0",
      downtimeReason: "",
      operators: "",
      remarks: "",
    },
  });

  function onSubmit(v: Values) {
    setServerError("");
    setSaved("");
    if (!v.productionOrderId) {
      setServerError("Select the production order");
      return;
    }
    if (v.hour === "") {
      setServerError("Select the hour");
      return;
    }
    if (!isCount(v.target) || !isCount(v.output)) {
      setServerError("Target and output must be whole numbers, 0 or more");
      return;
    }
    if (!isOptCount(v.reject) || !isOptCount(v.rework) || !isOptCount(v.downtimeMinutes) || !isOptCount(v.operators)) {
      setServerError("Reject, rework, downtime and operators must be whole numbers, 0 or more");
      return;
    }
    if (Number(v.downtimeMinutes) > 60) {
      setServerError("Downtime cannot be more than 60 minutes in one hour");
      return;
    }
    if (Number(v.downtimeMinutes) > 0 && !v.downtimeReason.trim()) {
      setServerError("Give a reason for the downtime");
      return;
    }
    start(async () => {
      const res = await saveSewingLogAction({ ...v, lineId, logDate: date });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      setSaved(`Saved ${v.hour}:00 - ${Number(v.hour) + 1}:00`);
      // একই প্রোডাকশন অর্ডার রেখে বাকি ঘর পরিষ্কার, যাতে পরের ঘণ্টা দ্রুত দেওয়া যায়
      reset({
        productionOrderId: getValues("productionOrderId"),
        hour: String(Math.min(Number(v.hour) + 1, 23)),
        target: v.target,
        output: "",
        reject: "0",
        rework: "0",
        downtimeMinutes: "0",
        downtimeReason: "",
        operators: v.operators,
        remarks: "",
      });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Record an hour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Production order" htmlFor="productionOrderId" required>
              <Select id="productionOrderId" {...register("productionOrderId")}>
                <option value="">Select...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Hour" htmlFor="hour" required hint="Saving the same hour again corrects it">
              <Select id="hour" {...register("hour")}>
                <option value="">Select...</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}:00 - {h + 1}:00
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Target" htmlFor="target" required>
              <Input id="target" type="number" step="1" min="0" {...register("target")} />
            </FormField>
            <FormField label="Output (good pcs)" htmlFor="output" required>
              <Input id="output" type="number" step="1" min="0" {...register("output")} />
            </FormField>
            <FormField label="Reject" htmlFor="reject">
              <Input id="reject" type="number" step="1" min="0" {...register("reject")} />
            </FormField>
            <FormField label="Rework" htmlFor="rework">
              <Input id="rework" type="number" step="1" min="0" {...register("rework")} />
            </FormField>
            <FormField label="Downtime (min)" htmlFor="downtimeMinutes">
              <Input id="downtimeMinutes" type="number" step="1" min="0" max="60" {...register("downtimeMinutes")} />
            </FormField>
            <FormField label="Downtime reason" htmlFor="downtimeReason">
              <Input id="downtimeReason" maxLength={200} {...register("downtimeReason")} />
            </FormField>
            <FormField label="Operators" htmlFor="operators">
              <Input id="operators" type="number" step="1" min="1" {...register("operators")} />
            </FormField>
            <FormField label="Remarks" htmlFor="remarks">
              <Input id="remarks" maxLength={500} {...register("remarks")} />
            </FormField>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          {saved && <p className="text-sm text-muted-foreground">{saved}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save hour"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}