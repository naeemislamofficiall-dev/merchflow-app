"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { recordInspectionAction } from "../actions";

type Option = { id: string; label: string };
type FactoryScoped = Option & { factoryId: string };

type Values = {
  stage: string;
  factoryId: string;
  productionOrderId: string;
  lineId: string;
  operation: string;
  sampleSize: string;
  defectiveQty: string;
  remarks: string;
  occurrences: { defectId: string; quantity: string; rootCause: string; correctiveAction: string }[];
};

const STAGES = ["INCOMING", "FABRIC", "CUTTING", "INLINE", "ENDLINE", "FINISHING"];
const NEEDS_PO = ["CUTTING", "INLINE", "ENDLINE", "FINISHING"];

const isPosInt = (v: string) => v !== "" && Number.isInteger(Number(v)) && Number(v) > 0;

export function InspectionForm({
  factories,
  lines,
  orders,
  defects,
}: {
  factories: Option[];
  lines: FactoryScoped[];
  orders: FactoryScoped[];
  defects: Option[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const { register, handleSubmit, control } = useForm<Values>({
    defaultValues: {
      stage: "ENDLINE",
      factoryId: "",
      productionOrderId: "",
      lineId: "",
      operation: "",
      sampleSize: "",
      defectiveQty: "0",
      remarks: "",
      occurrences: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "occurrences" });

  const stage = useWatch({ control, name: "stage" });
  const poId = useWatch({ control, name: "productionOrderId" });
  const pickedFactory = useWatch({ control, name: "factoryId" });

  const needsPo = NEEDS_PO.includes(stage);
  const poFactory = orders.find((o) => o.id === poId)?.factoryId ?? "";
  const factoryId = needsPo ? poFactory : pickedFactory;
  const factoryLines = lines.filter((l) => l.factoryId === factoryId);

  function onSubmit(v: Values) {
    setServerError("");
    if (needsPo && !v.productionOrderId) {
      setServerError("Select the production order for this stage");
      return;
    }
    if (!needsPo && !v.factoryId) {
      setServerError("Select the factory");
      return;
    }
    if (!isPosInt(v.sampleSize)) {
      setServerError("Sample size must be a whole number more than 0");
      return;
    }
    const defective = Number(v.defectiveQty || 0);
    if (!Number.isInteger(defective) || defective < 0 || defective > Number(v.sampleSize)) {
      setServerError("Defective pieces must be a whole number, not more than the sample size");
      return;
    }
    if (v.occurrences.some((o) => !o.defectId || !isPosInt(o.quantity))) {
      setServerError("Every defect row needs a defect and a quantity more than 0");
      return;
    }
    const total = v.occurrences.reduce((s, o) => s + Number(o.quantity), 0);
    if (defective > 0 && total < defective) {
      setServerError("Defect quantities must add up to at least the defective pieces");
      return;
    }

    start(async () => {
      const res = await recordInspectionAction({
        ...v,
        // যে স্টেজে PO লাগে সেখানে factory সার্ভিস নিজেই PO থেকে নেয়
        factoryId: needsPo ? "" : v.factoryId,
        productionOrderId: needsPo ? v.productionOrderId : "",
        lineId: factoryLines.some((l) => l.id === v.lineId) ? v.lineId : "",
      });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/quality/inspections/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>What was checked</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Stage" htmlFor="stage" required>
            <Select id="stage" {...register("stage")}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </Select>
          </FormField>

          {needsPo ? (
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
          ) : (
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
          )}

          <FormField label="Line" htmlFor="lineId" hint="Optional">
            <Select id="lineId" {...register("lineId")}>
              <option value="">None</option>
              {factoryLines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Operation" htmlFor="operation" hint="Example: Collar attach">
            <Input id="operation" maxLength={100} {...register("operation")} />
          </FormField>
          <FormField label="Pieces checked" htmlFor="sampleSize" required>
            <Input id="sampleSize" type="number" step="1" min="1" {...register("sampleSize")} />
          </FormField>
          <FormField label="Defective pieces" htmlFor="defectiveQty">
            <Input id="defectiveQty" type="number" step="1" min="0" {...register("defectiveQty")} />
          </FormField>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defects found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && <p className="text-sm text-muted-foreground">No defects added.</p>}
          {fields.map((f, i) => (
            <div key={f.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[1fr_100px_1fr_1fr_auto]">
              <FormField label="Defect" htmlFor={`def-${i}`}>
                <Select id={`def-${i}`} {...register(`occurrences.${i}.defectId`)}>
                  <option value="">Select...</option>
                  {defects.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Qty" htmlFor={`dq-${i}`}>
                <Input id={`dq-${i}`} type="number" step="1" min="1" {...register(`occurrences.${i}.quantity`)} />
              </FormField>
              <FormField label="Root cause" htmlFor={`rc-${i}`}>
                <Input id={`rc-${i}`} maxLength={300} {...register(`occurrences.${i}.rootCause`)} />
              </FormField>
              <FormField label="Corrective action" htmlFor={`ca-${i}`}>
                <Input id={`ca-${i}`} maxLength={300} {...register(`occurrences.${i}.correctiveAction`)} />
              </FormField>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(i)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ defectId: "", quantity: "", rootCause: "", correctiveAction: "" })}
          >
            Add defect
          </Button>
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button disabled={pending}>{pending ? "Saving..." : "Save inspection"}</Button>
    </form>
  );
}