"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createWorkflowAction } from "./actions";

// প্রথম ৪টা এখন PR, PO, Costing, Shipment-এর সার্ভিসের সাথে জোড়া আছে
const ENTITY_TYPES = [
  "PurchaseOrder",
  "PurchaseRequisition",
  "CostSheet",
  "Shipment",
  "SampleRequest",
  "MaterialIssue",
  "StockAdjustment",
  "CreditNote",
];

type Step = { name: string; approverRoleId: string };
const blank = (): Step => ({ name: "", approverRoleId: "" });

export function WorkflowForm({ roles }: { roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([blank()]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function patch(i: number, p: Partial<Step>) {
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "");
    setError("");
    start(async () => {
      const res = await createWorkflowAction({
        code: get("code"),
        name: get("name"),
        entityType: get("entityType"),
        minAmount: get("minAmount"),
        maxAmount: get("maxAmount"),
        steps,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      setSteps([blank()]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Add approval rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <FormField label="Code" htmlFor="wf-code" required>
              <Input id="wf-code" name="code" maxLength={30} />
            </FormField>
            <FormField label="Name" htmlFor="wf-name" required>
              <Input id="wf-name" name="name" maxLength={100} />
            </FormField>
            <FormField label="Applies to" htmlFor="wf-type" required>
              <Select id="wf-type" name="entityType" defaultValue="PurchaseOrder">
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="From amount" htmlFor="wf-min" hint="Blank = 0">
              <Input id="wf-min" name="minAmount" inputMode="decimal" />
            </FormField>
            <FormField label="Up to (not incl.)" htmlFor="wf-max" hint="Blank = no limit">
              <Input id="wf-max" name="maxAmount" inputMode="decimal" />
            </FormField>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Steps, in order</p>
            {steps.map((s, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[2rem_1fr_1fr_auto] md:items-center">
                <span className="text-sm text-muted-foreground">{i + 1}.</span>
                <Input
                  placeholder="Step name, e.g. Manager"
                  value={s.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
                <Select value={s.approverRoleId} onChange={(e) => patch(i, { approverRoleId: e.target.value })}>
                  <option value="">Approver role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={steps.length === 1}
                  onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setSteps((x) => [...x, blank()])}>
              Add step
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save rule"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}