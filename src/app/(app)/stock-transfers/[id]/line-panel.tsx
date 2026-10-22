"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { addTransferLineAction } from "../actions";

export type SourceRow = {
  materialId: string;
  lotId: string;
  rollId: string;
  fromBinId: string;
  qty: number;
  isRoll: boolean;
  label: string;
};

export function LinePanel({
  id,
  sources,
  toBins,
}: {
  id: string;
  sources: SourceRow[];
  toBins: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [qty, setQty] = useState("");
  const [toBinId, setToBinId] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const src = pick === "" ? null : sources[Number(pick)];

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!src) {
      setError("Select what to move");
      return;
    }
    if (!src.isRoll && !(Number(qty) > 0)) {
      setError("Enter a quantity");
      return;
    }
    start(async () => {
      const res = await addTransferLineAction(id, {
        materialId: src.materialId,
        lotId: src.lotId,
        rollId: src.rollId,
        fromBinId: src.fromBinId,
        toBinId,
        quantity: src.isRoll ? "" : qty,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPick("");
      setQty("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Add line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Stock to move" htmlFor="pick" required hint="Only stock available in the source warehouse is listed">
              <Select id="pick" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Select stock</option>
                {sources.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity" htmlFor="qty" hint={src?.isRoll ? "A roll moves as a whole" : src ? `Up to ${src.qty}` : undefined}>
              <Input
                id="qty"
                type="number"
                step="any"
                min="0"
                disabled={!!src?.isRoll}
                value={src?.isRoll ? String(src.qty) : qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </FormField>
            <FormField label="Destination bin" htmlFor="toBin" hint="Optional">
              <Select id="toBin" value={toBinId} onChange={(e) => setToBinId(e.target.value)}>
                <option value="">No bin</option>
                {toBins.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Adding..." : "Add line"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
