"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createQuotationAction } from "../actions";

type Option = { id: string; label: string };
type Values = {
  supplierId: string;
  materialId: string;
  rfqId: string;
  unitPrice: string;
  currency: string;
  leadTimeDays: string;
  qualityRating: string;
  paymentTerms: string;
  validUntil: string;
  notes: string;
};

export function QuotationForm({
  suppliers,
  materials,
  rfqs,
}: {
  suppliers: Option[];
  materials: Option[];
  rfqs: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: {
      supplierId: "",
      materialId: "",
      rfqId: "",
      unitPrice: "",
      currency: "",
      leadTimeDays: "",
      qualityRating: "",
      paymentTerms: "",
      validUntil: "",
      notes: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.supplierId || !v.materialId) {
      setError("Supplier and material are required");
      return;
    }
    if (!(Number(v.unitPrice) > 0)) {
      setError("Unit price must be more than 0");
      return;
    }
    if (v.currency && v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, or leave it blank for the supplier currency");
      return;
    }
    if (v.leadTimeDays && (!Number.isInteger(Number(v.leadTimeDays)) || Number(v.leadTimeDays) <= 0)) {
      setError("Lead time must be a whole number of days");
      return;
    }
    if (v.qualityRating && (!Number.isInteger(Number(v.qualityRating)) || Number(v.qualityRating) < 0 || Number(v.qualityRating) > 100)) {
      setError("Quality rating must be a whole number from 0 to 100");
      return;
    }
    start(async () => {
      const res = await createQuotationAction({ ...v, currency: v.currency.trim().toUpperCase() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/quotations?materialId=${v.materialId}${v.rfqId ? `&rfqId=${v.rfqId}` : ""}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Supplier" htmlFor="supplierId" required>
              <Select id="supplierId" {...register("supplierId")}>
                <option value="">Select...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Material" htmlFor="materialId" required>
              <Select id="materialId" {...register("materialId")}>
                <option value="">Select...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="RFQ" htmlFor="rfqId" hint="Only sent RFQs">
              <Select id="rfqId" {...register("rfqId")}>
                <option value="">None</option>
                {rfqs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unit price" htmlFor="unitPrice" required>
              <Input id="unitPrice" type="number" step="any" min="0" {...register("unitPrice")} />
            </FormField>
            <FormField label="Currency" htmlFor="currency" hint="Blank = supplier currency">
              <Input id="currency" maxLength={3} {...register("currency")} />
            </FormField>
            <FormField label="Lead time (days)" htmlFor="leadTimeDays">
              <Input id="leadTimeDays" type="number" step="1" min="1" {...register("leadTimeDays")} />
            </FormField>
            <FormField label="Quality rating (0 to 100)" htmlFor="qualityRating">
              <Input id="qualityRating" type="number" step="1" min="0" max="100" {...register("qualityRating")} />
            </FormField>
            <FormField label="Payment terms" htmlFor="paymentTerms">
              <Input id="paymentTerms" maxLength={150} {...register("paymentTerms")} />
            </FormField>
            <FormField label="Valid until" htmlFor="validUntil">
              <Input id="validUntil" type="date" {...register("validUntil")} />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="notes">
            <Input id="notes" maxLength={1000} {...register("notes")} />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save quotation"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}