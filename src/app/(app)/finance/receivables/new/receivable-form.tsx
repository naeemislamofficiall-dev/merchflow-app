"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createReceivableAction } from "../../actions";

type Option = { id: string; label: string };
type OrderOption = Option & { buyerId: string; styles: Option[] };

type Values = {
  buyerId: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  remarks: string;
  lines: { orderId: string; styleId: string; quantity: string; unitPrice: string }[];
};

export function ReceivableForm({ buyers, orders }: { buyers: Option[]; orders: OrderOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      buyerId: "",
      invoiceDate: "",
      dueDate: "",
      currency: "USD",
      exchangeRate: "1",
      remarks: "",
      lines: [{ orderId: "", styleId: "", quantity: "", unitPrice: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const buyerId = useWatch({ control, name: "buyerId" });
  const lines = useWatch({ control, name: "lines" }) ?? [];
  const buyerOrders = orders.filter((o) => o.buyerId === buyerId);
  const total = lines.reduce((s, l) => s + (Number(l?.quantity) || 0) * (Number(l?.unitPrice) || 0), 0);

  function onSubmit(v: Values) {
    setError("");
    if (!v.buyerId || !v.invoiceDate) {
      setError("Buyer and invoice date are required");
      return;
    }
    if (v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, for example USD");
      return;
    }
    if (
      v.lines.some(
        (l) =>
          !l.orderId ||
          !l.styleId ||
          !Number.isInteger(Number(l.quantity)) ||
          Number(l.quantity) <= 0 ||
          !(Number(l.unitPrice) > 0)
      )
    ) {
      setError("Every line needs an order, style, a whole quantity and a price more than 0");
      return;
    }
    start(async () => {
      const res = await createReceivableAction({ ...v, currency: v.currency.trim().toUpperCase() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/finance/receivables/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Buyer" htmlFor="buyerId" required>
            <Select id="buyerId" {...register("buyerId")}>
              <option value="">Select...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
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
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f, i) => {
            const order = buyerOrders.find((o) => o.id === lines[i]?.orderId);
            return (
              <div key={f.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[1fr_1.4fr_110px_130px_auto]">
                <FormField label="Order" htmlFor={`o-${i}`}>
                  <Select id={`o-${i}`} {...register(`lines.${i}.orderId`)}>
                    <option value="">Select...</option>
                    {buyerOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Style" htmlFor={`s-${i}`}>
                  <Select id={`s-${i}`} {...register(`lines.${i}.styleId`)}>
                    <option value="">Select...</option>
                    {(order?.styles ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Quantity" htmlFor={`q-${i}`}>
                  <Input id={`q-${i}`} type="number" step="1" min="1" {...register(`lines.${i}.quantity`)} />
                </FormField>
                <FormField label="Unit price" htmlFor={`p-${i}`}>
                  <Input id={`p-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.unitPrice`)} />
                </FormField>
                <Button type="button" variant="outline" size="sm" disabled={fields.length === 1} onClick={() => remove(i)}>
                  Remove
                </Button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ orderId: "", styleId: "", quantity: "", unitPrice: "" })}
          >
            Add line
          </Button>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{total.toFixed(2)}</span>
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create invoice"}</Button>
    </form>
  );
}