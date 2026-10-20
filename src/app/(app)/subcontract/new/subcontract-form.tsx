"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { sendSubcontractAction } from "../actions";

type Option = { id: string; label: string };
type Values = {
  productionOrderId: string;
  vendorId: string;
  process: string;
  challanNo: string;
  sentQty: string;
  rate: string;
  currency: string;
  sentDate: string;
  dueDate: string;
  remarks: string;
};

const PROCESSES = ["PRINTING", "EMBROIDERY", "WASHING"];

export function SubcontractForm({
  productionOrders,
  vendors,
}: {
  productionOrders: Option[];
  vendors: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: {
      productionOrderId: "",
      vendorId: "",
      process: "PRINTING",
      challanNo: "",
      sentQty: "",
      rate: "",
      currency: "",
      sentDate: "",
      dueDate: "",
      remarks: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.productionOrderId || !v.vendorId || !v.challanNo.trim()) {
      setError("Production order, vendor and challan number are required");
      return;
    }
    if (!Number.isInteger(Number(v.sentQty)) || Number(v.sentQty) <= 0) {
      setError("Sent quantity must be a whole number more than 0");
      return;
    }
    if (v.rate === "" || Number(v.rate) < 0) {
      setError("Enter the rate per piece (0 or more)");
      return;
    }
    if (!v.sentDate || !v.dueDate) {
      setError("Sent date and due date are required");
      return;
    }
    if (v.dueDate < v.sentDate) {
      setError("Due date cannot be before the sent date");
      return;
    }
    if (v.currency && v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, or leave it blank for the vendor currency");
      return;
    }
    start(async () => {
      const res = await sendSubcontractAction({ ...v, currency: v.currency.trim().toUpperCase() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/subcontract/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Production order" htmlFor="productionOrderId" required>
              <Select id="productionOrderId" {...register("productionOrderId")}>
                <option value="">Select...</option>
                {productionOrders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Vendor" htmlFor="vendorId" required>
              <Select id="vendorId" {...register("vendorId")}>
                <option value="">Select...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Process" htmlFor="process" required>
              <Select id="process" {...register("process")}>
                {PROCESSES.map((p) => (
                  <option key={p} value={p}>
                    {p.toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Challan no" htmlFor="challanNo" required hint="Must be new">
              <Input id="challanNo" maxLength={60} {...register("challanNo")} />
            </FormField>
            <FormField label="Pieces sent" htmlFor="sentQty" required>
              <Input id="sentQty" type="number" step="1" min="1" {...register("sentQty")} />
            </FormField>
            <FormField label="Rate per piece" htmlFor="rate" required>
              <Input id="rate" type="number" step="any" min="0" {...register("rate")} />
            </FormField>
            <FormField label="Currency" htmlFor="currency" hint="Blank = vendor currency">
              <Input id="currency" maxLength={3} {...register("currency")} />
            </FormField>
            <FormField label="Sent date" htmlFor="sentDate" required>
              <Input id="sentDate" type="date" {...register("sentDate")} />
            </FormField>
            <FormField label="Due date" htmlFor="dueDate" required>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Send goods"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}