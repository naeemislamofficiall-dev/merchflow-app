"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ChevronDown, Plus } from "lucide-react";
import { createBinAction, createWarehouseAction } from "./actions";

export type Option = { id: string; label: string };

const TYPES = [
  "FABRIC",
  "TRIMS",
  "ACCESSORIES",
  "RAW_MATERIAL",
  "CHEMICAL",
  "GENERAL_STORE",
  "WIP",
  "FINISHED_GOODS",
];

type WhValues = { factoryId: string; code: string; name: string; type: string };
type BinValues = { warehouseId: string; code: string; description: string };

const nice = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const FIELD =
  "h-12 w-full rounded-lg border bg-card px-4 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200";
const SUBMIT =
  "inline-flex h-12 items-center gap-2.5 rounded-lg bg-navy-800 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60";

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-800">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
    </div>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-5 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
      <span className="h-6 w-1 rounded-full bg-blue-600" />
      {children}
    </h2>
  );
}

export function WarehouseForm({ factories }: { factories: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<WhValues>({
    defaultValues: { factoryId: "", code: "", name: "", type: "FABRIC" },
  });

  function onSubmit(values: WhValues) {
    setError("");
    if (!values.factoryId || !values.code.trim() || !values.name.trim()) {
      setError("Factory, code and name are required");
      return;
    }
    start(async () => {
      const res = await createWarehouseAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <section id="add-warehouse" className="scroll-mt-6 rounded-card border bg-card p-6 shadow-card">
        <CardTitle>Add Warehouse</CardTitle>
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Factory" htmlFor="wh-factory" required>
            <SelectWrap>
              <select id="wh-factory" {...register("factoryId")} className={`${FIELD} appearance-none pr-10`}>
                <option value="">Select factory...</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
          <Field label="Code" htmlFor="wh-code" required>
            <input id="wh-code" maxLength={20} placeholder="e.g. WH-001" {...register("code")} className={FIELD} />
          </Field>
          <Field label="Name" htmlFor="wh-name" required>
            <input
              id="wh-name"
              maxLength={100}
              placeholder="e.g. Main Warehouse"
              {...register("name")}
              className={FIELD}
            />
          </Field>
          <Field label="Type" htmlFor="wh-type">
            <SelectWrap>
              <select id="wh-type" {...register("type")} className={`${FIELD} appearance-none pr-10`}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {nice(t)}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={pending} className={`${SUBMIT} mt-6`}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {pending ? "Saving..." : "Add Warehouse"}
        </button>
      </section>
    </form>
  );
}

export function BinForm({ warehouses }: { warehouses: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<BinValues>({
    defaultValues: { warehouseId: "", code: "", description: "" },
  });

  function onSubmit(values: BinValues) {
    setError("");
    if (!values.warehouseId || !values.code.trim()) {
      setError("Warehouse and bin code are required");
      return;
    }
    start(async () => {
      const res = await createBinAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <section className="rounded-card border bg-card p-6 shadow-card">
        <CardTitle>Add Bin</CardTitle>
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Warehouse" htmlFor="bin-wh" required>
            <SelectWrap>
              <select id="bin-wh" {...register("warehouseId")} className={`${FIELD} appearance-none pr-10`}>
                <option value="">Select warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
          <Field label="Bin code" htmlFor="bin-code" required>
            <input id="bin-code" maxLength={20} placeholder="e.g. B-01" {...register("code")} className={FIELD} />
          </Field>
          <Field label="Description" htmlFor="bin-desc">
            <input
              id="bin-desc"
              maxLength={200}
              placeholder="e.g. Max capacity 1000 kg"
              {...register("description")}
              className={FIELD}
            />
          </Field>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={pending} className={`${SUBMIT} mt-6`}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {pending ? "Saving..." : "Add Bin"}
        </button>
      </section>
    </form>
  );
}