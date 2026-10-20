"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { saveRateAction } from "./actions";

export function RateForm({ currencies, base }: { currencies: string[]; base: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError("");
    setSaved(false);
    start(async () => {
      const res = await saveRateAction({
        fromCode: String(fd.get("fromCode") ?? ""),
        toCode: String(fd.get("toCode") ?? ""),
        rate: String(fd.get("rate") ?? ""),
        rateDate: String(fd.get("rateDate") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  if (currencies.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No currencies in the database. Run <code>npx tsx scripts/seed-currency.ts</code> first.
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Add or update a rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="From" htmlFor="rate-from" required>
              <Select id="rate-from" name="fromCode" defaultValue={currencies.find((c) => c !== base) ?? currencies[0]}>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="To" htmlFor="rate-to" required>
              <Select id="rate-to" name="toCode" defaultValue={base}>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Rate" htmlFor="rate-value" required hint="Example: USD to BDT = 120">
              <Input id="rate-value" name="rate" inputMode="decimal" placeholder="120.00" />
            </FormField>
            <FormField label="Date" htmlFor="rate-date" required>
              <Input id="rate-date" name="rateDate" type="date" defaultValue={today} />
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">Rate saved</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Save rate"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}