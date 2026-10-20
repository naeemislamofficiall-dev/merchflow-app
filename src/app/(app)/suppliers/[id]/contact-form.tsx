"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { addSupplierContactAction } from "../actions";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  designation: z.string().max(100),
  email: z.string().refine((v) => v === "" || z.string().email().safeParse(v).success, "Invalid email"),
  phone: z.string().max(40),
  isPrimary: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function ContactForm({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", designation: "", email: "", phone: "", isPrimary: false },
  });

  function onSubmit({ isPrimary, ...values }: Values) {
    setServerError("");
    start(async () => {
      const res = await addSupplierContactAction(supplierId, values, isPrimary);
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
      <Card>
        <CardHeader>
          <CardTitle>Add contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField label="Name" htmlFor="c-name" required error={errors.name?.message}>
            <Input id="c-name" {...register("name")} />
          </FormField>
          <FormField label="Designation" htmlFor="c-designation" error={errors.designation?.message}>
            <Input id="c-designation" {...register("designation")} />
          </FormField>
          <FormField label="Email" htmlFor="c-email" error={errors.email?.message}>
            <Input id="c-email" type="email" {...register("email")} />
          </FormField>
          <FormField label="Phone" htmlFor="c-phone" error={errors.phone?.message}>
            <Input id="c-phone" {...register("phone")} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isPrimary")} />
            Primary contact
          </label>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add contact"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}