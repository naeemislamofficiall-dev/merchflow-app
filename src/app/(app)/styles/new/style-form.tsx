"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { createStyleAction } from "../actions";

const schema = z.object({
  styleNo: z.string().min(1, "Required").max(40),
  buyerId: z.string().min(1, "Choose a buyer"),
  name: z.string().min(1, "Required").max(150),
  category: z.string().max(80),
  garmentType: z.string().max(80),
  gender: z.string().max(40),
  fabricType: z.string().max(100),
  composition: z.string().max(200),
  gsm: z.string().refine((v) => v === "" || /^[1-9][0-9]{0,3}$/.test(v), "Whole number, e.g. 180"),
  construction: z.string().max(200),
  washType: z.string().max(100),
  print: z.string().max(200),
  embroidery: z.string().max(200),
  description: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

export function StyleForm({ buyers }: { buyers: { id: string; label: string }[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      styleNo: "", buyerId: "", name: "", category: "", garmentType: "", gender: "",
      fabricType: "", composition: "", gsm: "", construction: "", washType: "",
      print: "", embroidery: "", description: "",
    },
  });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = await createStyleAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/styles/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Style no" htmlFor="styleNo" required error={errors.styleNo?.message}>
            <Input id="styleNo" {...register("styleNo")} />
          </FormField>
          <FormField label="Buyer" htmlFor="buyerId" required error={errors.buyerId?.message}>
            <Select id="buyerId" {...register("buyerId")}>
              <option value="">Select buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Category" htmlFor="category" error={errors.category?.message}>
            <Input id="category" placeholder="e.g. Tops" {...register("category")} />
          </FormField>
          <FormField label="Garment type" htmlFor="garmentType" error={errors.garmentType?.message}>
            <Input id="garmentType" placeholder="e.g. Polo shirt" {...register("garmentType")} />
          </FormField>
          <FormField label="Gender" htmlFor="gender" error={errors.gender?.message}>
            <Input id="gender" placeholder="e.g. Men" {...register("gender")} />
          </FormField>
          <FormField label="Fabric type" htmlFor="fabricType" error={errors.fabricType?.message}>
            <Input id="fabricType" placeholder="e.g. Single jersey" {...register("fabricType")} />
          </FormField>
          <FormField label="Composition" htmlFor="composition" error={errors.composition?.message}>
            <Input id="composition" placeholder="e.g. 100% cotton" {...register("composition")} />
          </FormField>
          <FormField label="GSM" htmlFor="gsm" error={errors.gsm?.message}>
            <Input id="gsm" inputMode="numeric" {...register("gsm")} />
          </FormField>
          <FormField label="Construction" htmlFor="construction" error={errors.construction?.message}>
            <Input id="construction" {...register("construction")} />
          </FormField>
          <FormField label="Wash type" htmlFor="washType" error={errors.washType?.message}>
            <Input id="washType" {...register("washType")} />
          </FormField>
          <FormField label="Print" htmlFor="print" error={errors.print?.message}>
            <Input id="print" {...register("print")} />
          </FormField>
          <FormField label="Embroidery" htmlFor="embroidery" error={errors.embroidery?.message}>
            <Input id="embroidery" {...register("embroidery")} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" {...register("description")} />
        </FormField>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : "Save style"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/styles")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}