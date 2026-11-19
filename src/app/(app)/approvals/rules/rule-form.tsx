"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RotateCcw, Send, ShieldCheck, Trash2 } from "lucide-react";
import { humanize } from "@/components/approvals/ui";
import { createWorkflowAction } from "../actions";

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

const field =
  "h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200";

function Lbl({ text, required, hint, children }: { text: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy-800">
        {text} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function RuleForm({ roles }: { roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>(["", ""]); // prottek step-er approver role id
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    setError("");
    if (steps.some((s) => !s)) {
      setError("Select an approver role for every step");
      return;
    }
    start(async () => {
      const res = await createWorkflowAction({
        code: get("code"),
        name: get("name"),
        entityType: get("entityType"),
        minAmount: get("minAmount"),
        maxAmount: get("maxAmount"),
        steps: steps.map((approverRoleId, i) => ({ name: `Step ${i + 1}`, approverRoleId })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/approvals");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      onReset={() => {
        setSteps(["", ""]);
        setError("");
      }}
      className="overflow-hidden rounded-card border bg-card shadow-card"
    >
      {/* header */}
      <div className="flex items-center gap-4 bg-linear-to-r from-blue-50 to-white p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-blue-500 bg-white text-blue-600">
          <ShieldCheck className="h-8 w-8" fill="currentColor" fillOpacity={0.2} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy-800">Add Approval Rule</h1>
          <p className="text-sm text-slate-500">Create a new approval rule for your workflow</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1fr_1fr]">
          <Lbl text="Code" required>
            <input name="code" maxLength={30} placeholder="e.g. AR-001" className={field} />
          </Lbl>
          <Lbl text="Name" required>
            <input name="name" maxLength={100} placeholder="Enter rule name" className={field} />
          </Lbl>
          <Lbl text="Applies to" required>
            <select name="entityType" defaultValue="PurchaseOrder" className={field}>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>
          </Lbl>
          <Lbl text="From amount" hint="Blank = 0">
            <input name="minAmount" inputMode="decimal" placeholder="e.g. 0" className={field} />
          </Lbl>
          <Lbl text="Up to (not incl.)" hint="Blank = no limit">
            <input name="maxAmount" inputMode="decimal" placeholder="e.g. 10000" className={field} />
          </Lbl>
        </div>

        {/* steps */}
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="mb-4 text-sm font-semibold text-navy-800">Steps, in order</p>
          <div>
            {steps.map((roleId, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="my-1 w-0.5 flex-1 bg-blue-300" />}
                </div>
                <div className="flex flex-1 flex-wrap gap-3 pb-3">
                  <select
                    value={roleId}
                    onChange={(e) => setSteps((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                    aria-label={`Approver role for step ${i + 1}`}
                    className={`${field} min-w-56 flex-1 bg-white`}
                  >
                    <option value="">Select approver role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={steps.length === 1}
                    onClick={() => setSteps((s) => s.filter((_, j) => j !== i))}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSteps((s) => [...s, ""])}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-200 bg-white/60 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> Add step
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            type="reset"
            className="inline-flex h-11 items-center gap-2 rounded-lg border bg-card px-5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save Rule
          </button>
        </div>
      </div>
    </form>
  );
}