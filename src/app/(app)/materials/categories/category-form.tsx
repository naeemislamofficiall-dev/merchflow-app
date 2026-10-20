"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { createCategoryAction } from "../actions";

const schema = z.object({
  code: z.string().min(1, "Required").max(20),
  name: z.string().min(1, "Required").max(100),
});
type Values = z.infer<typeof schema>;

export function CategoryForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: "", name: "" } });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await createCategoryAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-3 p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <FormField label="Code" htmlFor="cat-code" required error={errors.code?.message}>
            <Input id="cat-code" {...register("code")} />
          </FormField>
          <FormField label="Name" htmlFor="cat-name" required error={errors.name?.message}>
            <Input id="cat-name" {...register("name")} />
          </FormField>
          <Button disabled={pending}>{pending ? "Saving..." : "Add category"}</Button>
        </div>
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      </Card>
    </form>
  );
}