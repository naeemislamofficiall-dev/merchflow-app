"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createProductionAction } from "../actions";

type Option = { id: string; label: string };
type OrderOption = Option & { styles: { id: string; label: string; qty: number }[] };
type LineOption = Option & { factoryId: string };

type Values = {
  factoryId: string;
  orderId: string;
  styleId: string;
  routeId: string;
  lineId: string;
  quantity: string;
  startDate: string;
  endDate: string;
  priority: string;
  allowancePct: string;
  remarks: string;
};

export function ProductionForm({
  factories,
  lines,
  orders,
  routes,
}: {
  factories: Option[];
  lines: LineOption[];
  orders: OrderOption[];
  routes: Option[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      factoryId: "",
      orderId: "",
      styleId: "",
      routeId: "",
      lineId: "",
      quantity: "",
      startDate: "",
      endDate: "",
      priority: "3",
      allowancePct: "0",
      remarks: "",
    },
  });

  const factoryId = useWatch({ control, name: "factoryId" });
  const orderId = useWatch({ control, name: "orderId" });
  const styles = orders.find((o) => o.id === orderId)?.styles ?? [];
  const factoryLines = lines.filter((l) => l.factoryId === factoryId);

  function onSubmit(v: Values) {
    setServerError("");
    if (!v.factoryId || !v.orderId || !v.styleId || !v.routeId) {
      setServerError("Factory, order, style and route are required");
      return;
    }
    const qty = Number(v.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setServerError("Quantity must be a whole number more than 0");
      return;
    }
    if (!v.startDate || !v.endDate) {
      setServerError("Start and end dates are required");
      return;
    }
    start(async () => {
      const res = await createProductionAction(v);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/production-orders/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>What to produce</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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
          <FormField label="Style" htmlFor="styleId" required>
            <Select id="styleId" {...register("styleId")}>
              <option value="">Select...</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} (order qty {s.qty})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quantity" htmlFor="quantity" required>
            <Input id="quantity" type="number" step="1" min="1" {...register("quantity")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where and when</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Factory" htmlFor="factoryId" required>
            <Select id="factoryId" {...register("factoryId")}>
              <option value="">Select...</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Sewing line" htmlFor="lineId" hint="Optional">
            <Select id="lineId" {...register("lineId")}>
              <option value="">None</option>
              {factoryLines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Route" htmlFor="routeId" required>
            <Select id="routeId" {...register("routeId")}>
              <option value="">Select...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Start date" htmlFor="startDate" required>
            <Input id="startDate" type="date" {...register("startDate")} />
          </FormField>
          <FormField label="End date" htmlFor="endDate" required>
            <Input id="endDate" type="date" {...register("endDate")} />
          </FormField>
          <FormField label="Priority" htmlFor="priority" hint="1 = most urgent, 5 = least">
            <Select id="priority" {...register("priority")}>
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cutting allowance %" htmlFor="allowancePct" hint="0 to 20">
            <Input id="allowancePct" type="number" step="any" min="0" max="20" {...register("allowancePct")} />
          </FormField>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create production order"}</Button>
    </form>
  );
}