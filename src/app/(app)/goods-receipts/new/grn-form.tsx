"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createGrnAction } from "../actions";

export type WarehouseOption = { id: string; label: string; bins: { id: string; code: string }[] };
export type PoLineOption = { id: string; material: string; unit: string; ordered: number; received: number };

type LineValues = {
  include: boolean;
  receivedQty: string;
  lotNo: string;
  color: string;
  shade: string;
  binId: string;
  overReason: string;
  rolls: string;
};
type Values = {
  warehouseId: string;
  challanNo: string;
  receivedDate: string;
  remarks: string;
  lines: LineValues[];
};

const isPositive = (v: string) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0;

export function GrnForm({
  poId,
  warehouses,
  lines,
}: {
  poId: string;
  warehouses: WarehouseOption[];
  lines: PoLineOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

    const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      warehouseId: "",
      challanNo: "",
      receivedDate: "",
      remarks: "",
      lines: lines.map((l) => ({
        include: true,
        receivedQty: String(Math.max(l.ordered - l.received, 0)),
        lotNo: "",
        color: "",
        shade: "",
        binId: "",
        overReason: "",
        rolls: "",
      })),
    },
  });

  const warehouseId = useWatch({ control, name: "warehouseId" });
  const bins = warehouses.find((w) => w.id === warehouseId)?.bins ?? [];

  function onSubmit(values: Values) {
    setServerError("");
    if (!values.warehouseId) {
      setServerError("Select a warehouse");
      return;
    }
    const picked = values.lines.map((l, i) => ({ l, poLineId: lines[i].id })).filter((x) => x.l.include);
    if (picked.length === 0) {
      setServerError("Select at least one line");
      return;
    }
    if (picked.some((x) => !isPositive(x.l.receivedQty))) {
      setServerError("Every selected line needs a received quantity more than 0");
      return;
    }

    start(async () => {
      const res = await createGrnAction({
        poId,
        warehouseId: values.warehouseId,
        challanNo: values.challanNo,
        receivedDate: values.receivedDate,
        remarks: values.remarks,
        lines: picked.map((x) => ({
          poLineId: x.poLineId,
          receivedQty: x.l.receivedQty,
          lotNo: x.l.lotNo,
          color: x.l.color,
          shade: x.l.shade,
          binId: x.l.binId,
          overReason: x.l.overReason,
          rolls: x.l.rolls,
        })),
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/goods-receipts/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Receipt details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <FormField label="Warehouse" htmlFor="warehouseId" required>
            <Select id="warehouseId" {...register("warehouseId")}>
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Challan no" htmlFor="challanNo">
            <Input id="challanNo" maxLength={60} {...register("challanNo")} />
          </FormField>
          <FormField label="Received date" htmlFor="receivedDate" hint="Blank = today">
            <Input id="receivedDate" type="date" {...register("receivedDate")} />
          </FormField>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Received lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.id} className="space-y-3 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register(`lines.${i}.include`)} />
                <span>
                  <span className="font-medium">{l.material}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    ordered {l.ordered} {l.unit}, already received {l.received}
                  </span>
                </span>
              </label>
              <div className="grid gap-3 md:grid-cols-6">
                <FormField label="Received qty" htmlFor={`rq-${i}`}>
                  <Input id={`rq-${i}`} type="number" step="any" min="0" {...register(`lines.${i}.receivedQty`)} />
                </FormField>
                <FormField label="Lot no" htmlFor={`lot-${i}`}>
                  <Input id={`lot-${i}`} {...register(`lines.${i}.lotNo`)} />
                </FormField>
                <FormField label="Color" htmlFor={`col-${i}`}>
                  <Input id={`col-${i}`} {...register(`lines.${i}.color`)} />
                </FormField>
                <FormField label="Shade" htmlFor={`sh-${i}`}>
                  <Input id={`sh-${i}`} {...register(`lines.${i}.shade`)} />
                </FormField>
                <FormField label="Bin" htmlFor={`bin-${i}`}>
                  <Select id={`bin-${i}`} {...register(`lines.${i}.binId`)}>
                    <option value="">None</option>
                    {bins.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Over-receipt reason" htmlFor={`ov-${i}`} hint="Only if more than ordered">
                  <Input id={`ov-${i}`} {...register(`lines.${i}.overReason`)} />
                </FormField>
              </div>
              <FormField
                label="Fabric rolls (optional)"
                htmlFor={`rolls-${i}`}
                hint="One roll per line: quantity, or quantity, shade. Roll quantities must add up to the received qty"
              >
                <Textarea id={`rolls-${i}`} rows={3} {...register(`lines.${i}.rolls`)} />
              </FormField>
            </div>
          ))}
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Save as draft"}</Button>
    </form>
  );
}