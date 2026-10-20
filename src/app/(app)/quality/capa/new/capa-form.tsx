"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createCapaAction } from "../actions";

type Values = { title: string; category: string; problem: string; ownerId: string; dueDate: string };

export function CapaForm({ users }: { users: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: { title: "", category: "", problem: "", ownerId: "", dueDate: "" },
  });

  function onSubmit(v: Values) {
    setError("");
    if (v.title.trim().length < 3 || v.problem.trim().length < 3) {
      setError("Title and problem need at least 3 characters");
      return;
    }
    start(async () => {
      const res = await createCapaAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/quality/capa/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title" htmlFor="title" required>
              <Input id="title" maxLength={150} {...register("title")} />
            </FormField>
            <FormField label="Category" htmlFor="category" hint="Example: High sewing defect, Fabric shade problem">
              <Input id="category" maxLength={60} {...register("category")} />
            </FormField>
            <FormField label="Owner" htmlFor="ownerId">
              <Select id="ownerId" {...register("ownerId")}>
                <option value="">Not assigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Due date" htmlFor="dueDate">
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </FormField>
          </div>
          <FormField label="Problem" htmlFor="problem" required>
            <Textarea id="problem" rows={4} maxLength={1000} {...register("problem")} />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Create CAPA"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}