"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { addNegotiationAction } from "../actions";

const PRICE = /^[0-9]+(\.[0-9]{1,4})?$/;

export function NegotiationForm({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const [initial, setInitial] = useState("");
  const [target, setTarget] = useState("");
  const [revised, setRevised] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fields = [initial.trim(), target.trim(), revised.trim()];
    if (fields.every((f) => f === "") && reason.trim() === "") {
      setError("Enter at least one price or a reason");
      return;
    }
    if (fields.some((f) => f !== "" && !PRICE.test(f))) {
      setError("Prices must be numbers like 4.25");
      return;
    }
    start(async () => {
      const res = await addNegotiationAction({
        enquiryId,
        initialQuotedPrice: initial.trim() ? Number(initial) : undefined,
        buyerTarget: target.trim() ? Number(target) : undefined,
        revisedPrice: revised.trim() ? Number(revised) : undefined,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInitial("");
      setTarget("");
      setRevised("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-base font-semibold">Add negotiation round</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="Our quoted price" htmlFor="neg-initial">
            <Input id="neg-initial" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} />
          </FormField>
          <FormField label="Buyer target" htmlFor="neg-target">
            <Input id="neg-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </FormField>
          <FormField label="Revised price" htmlFor="neg-revised">
            <Input id="neg-revised" inputMode="decimal" value={revised} onChange={(e) => setRevised(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Reason / note" htmlFor="neg-reason">
          <Input id="neg-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add round"}
        </Button>
      </form>
    </Card>
  );
}