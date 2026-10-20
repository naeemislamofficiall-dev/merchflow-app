"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createBomAction } from "../actions";

export function BomForm({ styles }: { styles: { id: string; label: string }[] }) {
  const router = useRouter();
  const [styleId, setStyleId] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!styleId) {
      setError("Select a style");
      return;
    }
    setError("");
    start(async () => {
      const res = await createBomAction(styleId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/bom/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={submit}>
      <Card className="space-y-4 p-4">
        <FormField label="Style" htmlFor="styleId" required hint="A style can have only one draft BOM at a time">
          <Select id="styleId" value={styleId} onChange={(e) => setStyleId(e.target.value)}>
            <option value="">Select style...</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={pending}>{pending ? "Creating..." : "Create BOM"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/bom")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}