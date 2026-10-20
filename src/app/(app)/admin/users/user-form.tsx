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
import { createUserAction, updateUserAction } from "./actions";

type Option = { id: string; name: string };

const schema = z.object({
  name: z.string().min(1, "Required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string(),
  roleId: z.string().min(1, "Required"),
  scope: z.enum(["COMPANY", "FACTORY"]),
  factoryId: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
type Values = z.infer<typeof schema>;

export function UserForm({
  id,
  initial,
  roles,
  factories,
  isSelf,
}: {
  id?: string;
  initial?: Omit<Values, "password">;
  roles: Option[];
  factories: Option[];
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const editing = Boolean(id);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", ...(initial ?? { name: "", email: "", roleId: "", scope: "COMPANY", factoryId: "", status: "ACTIVE" }) },
  });
  const scope = watch("scope");

  function onSubmit(values: Values) {
    setServerError("");
    setSaved(false);
    if (!editing && values.password.length < 8) {
      setServerError("Password must be at least 8 characters, with a letter and a number");
      return;
    }
    start(async () => {
      const payload: Record<string, string> = {
        name: values.name,
        roleId: values.roleId,
        scope: values.scope,
        status: values.status,
        ...(values.scope === "FACTORY" && values.factoryId ? { factoryId: values.factoryId } : {}),
      };
      const res = id
        ? await updateUserAction(id, payload)
        : await createUserAction({ ...payload, email: values.email, password: values.password });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      if (id) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/users/${res.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField
            label="Email"
            htmlFor="email"
            required
            error={errors.email?.message}
            hint={editing ? "Email cannot be changed" : "Used to sign in"}
          >
            <Input id="email" type="email" readOnly={editing} {...register("email")} />
          </FormField>
          {!editing && (
            <FormField
              label="Password"
              htmlFor="password"
              required
              hint="At least 8 characters, with a letter and a number"
            >
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            </FormField>
          )}
          <FormField
            label="Role"
            htmlFor="roleId"
            required
            error={errors.roleId?.message}
            hint={isSelf ? "You cannot change your own role" : undefined}
          >
            {isSelf ? (
              <>
                <Select id="roleId" disabled value={initial?.roleId ?? ""} onChange={() => undefined}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
                <input type="hidden" {...register("roleId")} />
              </>
            ) : (
              <Select id="roleId" {...register("roleId")}>
                <option value="">Select role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Data access" htmlFor="scope" required>
            <Select id="scope" {...register("scope")}>
              <option value="COMPANY">Whole company</option>
              <option value="FACTORY">One factory only</option>
            </Select>
          </FormField>
          {scope === "FACTORY" && (
            <FormField label="Factory" htmlFor="factoryId" required>
              <Select id="factoryId" {...register("factoryId")}>
                <option value="">Select factory...</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {editing && (
            <FormField
              label="Status"
              htmlFor="status"
              hint={isSelf ? "You cannot deactivate your own account" : "Inactive users cannot sign in"}
            >
              {isSelf ? (
                <>
                  <Select id="status" disabled value="ACTIVE" onChange={() => undefined}>
                    <option value="ACTIVE">Active</option>
                  </Select>
                  <input type="hidden" {...register("status")} />
                </>
              ) : (
                <Select id="status" {...register("status")}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              )}
            </FormField>
          )}
        </div>
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        {saved && <p className="text-sm text-emerald-700">Saved.</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : editing ? "Save changes" : "Create user"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
