"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createDefectAction } from "./actions";

type Values = { code: string; name: string; category: string; severity: string };

export function DefectForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<Values>({
    defaultValues: { code: "", name: "", category: "", severity: "MINOR" },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.code.trim() || !v.name.trim()) {
      setError("Code and name are required");
      return;
    }
    start(async () => {
      const res = await createDefectAction(v);
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
          <CardTitle>Add defect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Code" htmlFor="d-code" required>
              <Input id="d-code" maxLength={20} {...register("code")} />
            </FormField>
            <FormField label="Name" htmlFor="d-name" required>
              <Input id="d-name" maxLength={100} {...register("name")} />
            </FormField>
            <FormField label="Category" htmlFor="d-cat" hint="Example: Sewing, Fabric, Measurement">
              <Input id="d-cat" maxLength={60} {...register("category")} />
            </FormField>
            <FormField label="Severity" htmlFor="d-sev">
              <Select id="d-sev" {...register("severity")}>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add defect"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}