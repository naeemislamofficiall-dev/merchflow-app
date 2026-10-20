"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createAqlAction, previewAqlAction } from "../actions";

const LEVELS = ["S1", "S2", "S3", "S4", "I", "II", "III"];

type Values = {
  stage: string;
  orderId: string;
  productionOrderId: string;
  inspectionLevel: string;
  lotSize: string;
  aqlMajor: string;
  aqlMinor: string;
  remarks: string;
};

type Preview = {
  sampleSize: number;
  acceptMajor: number;
  rejectMajor: number;
  acceptMinor: number;
  rejectMinor: number;
};

export function AqlForm({
  orders,
  productionOrders,
}: {
  orders: { id: string; label: string }[];
  productionOrders: { id: string; orderId: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();

  const { register, handleSubmit, control, getValues } = useForm<Values>({
    defaultValues: {
      stage: "FINAL",
      orderId: "",
      productionOrderId: "",
      inspectionLevel: "II",
      lotSize: "",
      aqlMajor: "",
      aqlMinor: "",
      remarks: "",
    },
  });

  const orderId = useWatch({ control, name: "orderId" });
  const orderPos = productionOrders.filter((p) => p.orderId === orderId);

  function calc() {
    setError("");
    const v = getValues();
    if (!Number.isInteger(Number(v.lotSize)) || Number(v.lotSize) <= 0) {
      setError("Lot size must be a whole number more than 0");
      return;
    }
    start(async () => {
      const res = await previewAqlAction(v);
      if (!res.ok) {
        setPreview(null);
        setError(res.error);
        return;
      }
      setPreview(res.data);
    });
  }

  function onSubmit(v: Values) {
    setError("");
    if (!v.orderId || !v.productionOrderId) {
      setError("Select the order and the production order");
      return;
    }
    if (!Number.isInteger(Number(v.lotSize)) || Number(v.lotSize) <= 0) {
      setError("Lot size must be a whole number more than 0");
      return;
    }
    start(async () => {
      const res = await createAqlAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/quality/aql/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>What to inspect</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Stage" htmlFor="stage" required>
            <Select id="stage" {...register("stage")}>
              <option value="FINAL">Final</option>
              <option value="PRESHIPMENT">Pre-shipment</option>
            </Select>
          </FormField>
          <FormField label="Order" htmlFor="orderId" required>
            <Select id="orderId" {...register("orderId")}>
              <option value="">Select...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Production order" htmlFor="productionOrderId" required>
            <Select id="productionOrderId" {...register("productionOrderId")}>
              <option value="">Select...</option>
              {orderPos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sampling plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Lot size (pcs)" htmlFor="lotSize" required>
              <Input id="lotSize" type="number" step="1" min="1" {...register("lotSize")} />
            </FormField>
            <FormField label="Inspection level" htmlFor="level">
              <Select id="level" {...register("inspectionLevel")}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="AQL major" htmlFor="aqlMajor" hint="Blank = 2.5">
              <Input id="aqlMajor" type="number" step="any" min="0" {...register("aqlMajor")} />
            </FormField>
            <FormField label="AQL minor" htmlFor="aqlMinor" hint="Blank = 4.0">
              <Input id="aqlMinor" type="number" step="any" min="0" {...register("aqlMinor")} />
            </FormField>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={calc}>
            Work out the sample
          </Button>
          {preview && (
            <p className="text-sm text-muted-foreground">
              Check <span className="font-medium text-foreground">{preview.sampleSize}</span> pieces. Major: accept up to{" "}
              {preview.acceptMajor}, reject at {preview.rejectMajor}. Minor: accept up to {preview.acceptMinor}, reject at{" "}
              {preview.rejectMinor}. Critical: none allowed.
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create AQL inspection"}</Button>
    </form>
  );
}