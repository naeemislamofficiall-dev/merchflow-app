"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createCartonAction } from "../../actions";

type Option = { id: string; label: string };
type PoOption = Option & { orderId: string; colors: Option[]; sizes: Option[] };

type Values = {
  orderId: string;
  packType: string;
  grossWeightKg: string;
  netWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  lines: { productionOrderId: string; colorId: string; sizeId: string; quantity: string }[];
};

const PACK_TYPES = ["SOLID", "ASSORTMENT", "RATIO", "PREPACK"];
const isOptPos = (v: string) => v === "" || Number(v) > 0;

export function CartonForm({
  orders,
  productionOrders,
}: {
  orders: Option[];
  productionOrders: PoOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      orderId: "",
      packType: "SOLID",
      grossWeightKg: "",
      netWeightKg: "",
      lengthCm: "",
      widthCm: "",
      heightCm: "",
      lines: [{ productionOrderId: "", colorId: "", sizeId: "", quantity: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const orderId = useWatch({ control, name: "orderId" });
  const lines = useWatch({ control, name: "lines" }) ?? [];
  const orderPos = productionOrders.filter((p) => p.orderId === orderId);

  function onSubmit(v: Values) {
    setError("");
    if (!v.orderId) {
      setError("Select the order");
      return;
    }
    if (
      v.lines.some(
        (l) =>
          !l.productionOrderId ||
          !l.colorId ||
          !l.sizeId ||
          !Number.isInteger(Number(l.quantity)) ||
          Number(l.quantity) <= 0
      )
    ) {
      setError("Every line needs a production order, color, size and a whole quantity more than 0");
      return;
    }
    if (![v.grossWeightKg, v.netWeightKg, v.lengthCm, v.widthCm, v.heightCm].every(isOptPos)) {
      setError("Weights and sizes must be more than 0");
      return;
    }
    if (v.grossWeightKg && v.netWeightKg && Number(v.netWeightKg) > Number(v.grossWeightKg)) {
      setError("Net weight cannot be more than gross weight");
      return;
    }
    start(async () => {
      const res = await createCartonAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/packing/cartons/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Carton</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
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
          <FormField label="Pack type" htmlFor="packType">
            <Select id="packType" {...register("packType")}>
              {PACK_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p.toLowerCase()}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Gross weight (kg)" htmlFor="gross" hint="Needed before closing">
            <Input id="gross" type="number" step="any" min="0" {...register("grossWeightKg")} />
          </FormField>
          <FormField label="Net weight (kg)" htmlFor="net">
            <Input id="net" type="number" step="any" min="0" {...register("netWeightKg")} />
          </FormField>
          <FormField label="Length (cm)" htmlFor="len">
            <Input id="len" type="number" step="any" min="0" {...register("lengthCm")} />
          </FormField>
          <FormField label="Width (cm)" htmlFor="wid">
            <Input id="wid" type="number" step="any" min="0" {...register("widthCm")} />
          </FormField>
          <FormField label="Height (cm)" htmlFor="hei">
            <Input id="hei" type="number" step="any" min="0" {...register("heightCm")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What is inside</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((f, i) => {
            const po = orderPos.find((p) => p.id === lines[i]?.productionOrderId);
            return (
              <div key={f.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[1.4fr_1fr_1fr_110px_auto]">
                <FormField label="Production order" htmlFor={`po-${i}`}>
                  <Select id={`po-${i}`} {...register(`lines.${i}.productionOrderId`)}>
                    <option value="">Select...</option>
                    {orderPos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Color" htmlFor={`col-${i}`}>
                  <Select id={`col-${i}`} {...register(`lines.${i}.colorId`)}>
                    <option value="">Select...</option>
                    {(po?.colors ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Size" htmlFor={`size-${i}`}>
                  <Select id={`size-${i}`} {...register(`lines.${i}.sizeId`)}>
                    <option value="">Select...</option>
                    {(po?.sizes ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Pieces" htmlFor={`q-${i}`}>
                  <Input id={`q-${i}`} type="number" step="1" min="1" {...register(`lines.${i}.quantity`)} />
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
            onClick={() => append({ productionOrderId: "", colorId: "", sizeId: "", quantity: "" })}
          >
            Add line
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Create carton"}</Button>
    </form>
  );
}