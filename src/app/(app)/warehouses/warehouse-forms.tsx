"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
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
      <Card>
        <CardHeader>
          <CardTitle>Add warehouse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Factory" htmlFor="wh-factory" required>
              <Select id="wh-factory" {...register("factoryId")}>
                <option value="">Select...</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Code" htmlFor="wh-code" required>
              <Input id="wh-code" maxLength={20} {...register("code")} />
            </FormField>
            <FormField label="Name" htmlFor="wh-name" required>
              <Input id="wh-name" maxLength={100} {...register("name")} />
            </FormField>
            <FormField label="Type" htmlFor="wh-type">
              <Select id="wh-type" {...register("type")}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add warehouse"}</Button>
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Add bin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Warehouse" htmlFor="bin-wh" required>
              <Select id="bin-wh" {...register("warehouseId")}>
                <option value="">Select...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Bin code" htmlFor="bin-code" required>
              <Input id="bin-code" maxLength={20} {...register("code")} />
            </FormField>
            <FormField label="Description" htmlFor="bin-desc">
              <Input id="bin-desc" maxLength={200} {...register("description")} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add bin"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}