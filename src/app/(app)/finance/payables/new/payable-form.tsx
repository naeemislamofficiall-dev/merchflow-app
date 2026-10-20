"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createPayableAction } from "../../actions";

type Values = {
  supplierId: string;
  supplierInvoiceNo: string;
  poId: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  taxAmount: string;
  remarks: string;
};

export function PayableForm({
  suppliers,
  pos,
}: {
  suppliers: { id: string; label: string }[];
  pos: { id: string; supplierId: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      supplierId: "",
      supplierInvoiceNo: "",
      poId: "",
      invoiceDate: "",
      dueDate: "",
      currency: "BDT",
      exchangeRate: "1",
      subtotal: "",
      taxAmount: "0",
      remarks: "",
    },
  });

  const supplierId = useWatch({ control, name: "supplierId" });
  const subtotal = Number(useWatch({ control, name: "subtotal" })) || 0;
  const tax = Number(useWatch({ control, name: "taxAmount" })) || 0;
  const supplierPos = pos.filter((p) => p.supplierId === supplierId);

  function onSubmit(v: Values) {
    setError("");
    if (!v.supplierId || !v.supplierInvoiceNo.trim() || !v.invoiceDate) {
      setError("Supplier, supplier invoice number and invoice date are required");
      return;
    }
    if (!(Number(v.subtotal) > 0)) {
      setError("Subtotal must be more than 0");
      return;
    }
    if (v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, for example BDT");
      return;
    }
    start(async () => {
      const res = await createPayableAction({ ...v, currency: v.currency.trim().toUpperCase() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/finance/payables/${res.data.id}`);
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
            <FormField label="Supplier invoice no" htmlFor="supplierInvoiceNo" required>
              <Input id="supplierInvoiceNo" maxLength={60} {...register("supplierInvoiceNo")} />
            </FormField>
            <FormField label="Purchase order" htmlFor="poId" hint="Needed for matching">
              <Select id="poId" {...register("poId")}>
                <option value="">None</option>
                {supplierPos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Invoice date" htmlFor="invoiceDate" required>
              <Input id="invoiceDate" type="date" {...register("invoiceDate")} />
            </FormField>
            <FormField label="Due date" htmlFor="dueDate">
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </FormField>
            <FormField label="Currency" htmlFor="currency" required>
              <Input id="currency" maxLength={3} {...register("currency")} />
            </FormField>
            <FormField label="Exchange rate to base" htmlFor="exchangeRate">
              <Input id="exchangeRate" type="number" step="any" min="0" {...register("exchangeRate")} />
            </FormField>
            <FormField label="Subtotal (before tax)" htmlFor="subtotal" required>
              <Input id="subtotal" type="number" step="any" min="0" {...register("subtotal")} />
            </FormField>
            <FormField label="Tax amount" htmlFor="taxAmount">
              <Input id="taxAmount" type="number" step="any" min="0" {...register("taxAmount")} />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{(subtotal + tax).toFixed(2)}</span>
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Create invoice"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}