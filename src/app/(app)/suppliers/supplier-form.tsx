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
import { FormField } from "@/components/forms/form-field";
import { createSupplierAction, updateSupplierAction } from "./actions";

const CATEGORIES = [
  "FABRIC", "YARN", "TRIMS", "ACCESSORIES", "PACKAGING", "WASHING", "PRINTING", "EMBROIDERY", "TRANSPORT",
];

const schema = z.object({
  code: z.string().min(1, "Required").max(20),
  name: z.string().min(1, "Required").max(150),
  category: z.string().min(1, "Required"),
  country: z.string().max(80),
  currency: z.string().refine((v) => v === "" || v.length === 3, "Use a 3-letter code like USD"),
  leadTimeDays: z
    .string()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 0), "Whole number, 0 or more"),
  paymentTerms: z.string().max(150),
  address: z.string().max(300),
  bankName: z.string().max(100),
  bankBranch: z.string().max(100),
  bankAccountName: z.string().max(100),
  bankAccountNo: z.string().max(60),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  code: "", name: "", category: "", country: "", currency: "USD", leadTimeDays: "", paymentTerms: "",
  address: "", bankName: "", bankBranch: "", bankAccountName: "", bankAccountNo: "",
};

// id থাকলে edit মোড। খেয়াল: edit-এ কোনো ঘর ফাঁকা করলে সেটা মুছে যায় না, আগের মানই থাকে।
export function SupplierForm({ id, initial }: { id?: string; initial?: Values }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [pending, start] = useTransition();
  const editing = Boolean(id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial ?? EMPTY });

  function onSubmit(values: Values) {
    setServerError("");
    start(async () => {
      const res = id ? await updateSupplierAction(id, values) : await createSupplierAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push(`/suppliers/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Code"
            htmlFor="code"
            required
            error={errors.code?.message}
            hint={editing ? "Code cannot be changed" : undefined}
          >
            <Input id="code" readOnly={editing} {...register("code")} />
          </FormField>
          <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Category" htmlFor="category" required error={errors.category?.message}>
            <Select id="category" {...register("category")}>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Country" htmlFor="country" error={errors.country?.message}>
            <Input id="country" {...register("country")} />
          </FormField>
          <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField label="Lead time (days)" htmlFor="leadTimeDays" error={errors.leadTimeDays?.message}>
            <Input id="leadTimeDays" type="number" min="0" step="1" {...register("leadTimeDays")} />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms" error={errors.paymentTerms?.message}>
            <Input id="paymentTerms" {...register("paymentTerms")} />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="address" error={errors.address?.message}>
          <Input id="address" {...register("address")} />
        </FormField>

        <p className="pt-2 text-sm font-medium">Bank details</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Bank name" htmlFor="bankName" error={errors.bankName?.message}>
            <Input id="bankName" {...register("bankName")} />
          </FormField>
          <FormField label="Branch" htmlFor="bankBranch" error={errors.bankBranch?.message}>
            <Input id="bankBranch" {...register("bankBranch")} />
          </FormField>
          <FormField label="Account name" htmlFor="bankAccountName" error={errors.bankAccountName?.message}>
            <Input id="bankAccountName" {...register("bankAccountName")} />
          </FormField>
          <FormField label="Account number" htmlFor="bankAccountNo" error={errors.bankAccountNo?.message}>
            <Input id="bankAccountNo" {...register("bankAccountNo")} />
          </FormField>
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Saving..." : editing ? "Save changes" : "Save supplier"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(id ? `/suppliers/${id}` : "/suppliers")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}