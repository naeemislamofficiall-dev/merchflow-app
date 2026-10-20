"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createOrgAction, type OrgKind } from "./actions";

type Opt = { id: string; label: string };

const TITLE: Record<OrgKind, string> = {
  building: "Add building",
  floor: "Add floor",
  department: "Add department",
  line: "Add sewing line",
};

export function OrgForm({
  kind,
  factoryId,
  buildings = [],
  floors = [],
  departments = [],
}: {
  kind: OrgKind;
  factoryId: string;
  buildings?: Opt[];
  floors?: Opt[];
  departments?: Opt[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      values[k] = String(v);
    });
    if (kind === "building" || kind === "department") values.factoryId = factoryId;

    setError("");
    start(async () => {
      const res = await createOrgAction(kind, values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  const id = (s: string) => `${kind}-${s}`;

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{TITLE[kind]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {kind === "floor" && (
            <FormField label="Building" htmlFor={id("b")} required>
              <Select id={id("b")} name="buildingId">
                <option value="">Select...</option>
                {buildings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {(kind === "department" || kind === "line") && (
            <FormField label="Floor" htmlFor={id("f")} required={kind === "line"}>
              <Select id={id("f")} name="floorId">
                <option value="">{kind === "line" ? "Select..." : "None"}</option>
                {floors.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {kind === "line" && (
            <FormField label="Department" htmlFor={id("d")}>
              <Select id={id("d")} name="departmentId">
                <option value="">None</option>
                {departments.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Code" htmlFor={id("c")} required>
              <Input id={id("c")} name="code" maxLength={20} />
            </FormField>
            <FormField label="Name" htmlFor={id("n")} required>
              <Input id={id("n")} name="name" maxLength={100} />
            </FormField>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : TITLE[kind]}</Button>
        </CardContent>
      </Card>
    </form>
  );
}