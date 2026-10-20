"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { convertEnquiryAction } from "../actions";

type Item = { id: string; label: string; quantity: number; targetPrice: string };

export function ConvertPanel({
  enquiryId,
  items,
  allLinked,
  shipDate,
}: {
  enquiryId: string;
  items: Item[];
  allLinked: boolean;
  shipDate: string;
}) {
  const router = useRouter();
  const [buyerPoNo, setBuyerPoNo] = useState("");
  const [ship, setShip] = useState(shipDate);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(items.map((it) => [it.id, it.targetPrice]))
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const out: Record<string, number> = {};
    for (const it of items) {
      const raw = (prices[it.id] ?? "").trim();
      if (!/^[0-9]+(\.[0-9]{1,4})?$/.test(raw)) {
        setError(`Enter a valid unit price for "${it.label}"`);
        return;
      }
      out[it.id] = Number(raw);
    }
    start(async () => {
      const res = await convertEnquiryAction(enquiryId, {
        buyerPoNo: buyerPoNo.trim() || undefined,
        shipDate: ship || undefined,
        prices: out,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/orders/${res.data.orderId}?tab=matrix`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to order</CardTitle>
      </CardHeader>
      <CardContent>
        {!allLinked ? (
          <p className="text-sm text-destructive">
            Every enquiry item needs a linked style before it can become an order. Create the enquiry again with styles
            linked.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Buyer PO no" htmlFor="cv-po">
                <Input id="cv-po" value={buyerPoNo} onChange={(e) => setBuyerPoNo(e.target.value)} />
              </FormField>
              <FormField label="Ship date" htmlFor="cv-ship">
                <Input id="cv-ship" type="date" value={ship} onChange={(e) => setShip(e.target.value)} />
              </FormField>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Final unit price for each item</p>
              {items.map((it) => (
                <div key={it.id} className="grid items-center gap-3 md:grid-cols-[2fr_1fr_1fr]">
                  <span className="text-sm">{it.label}</span>
                  <span className="text-sm text-muted-foreground">{it.quantity.toLocaleString("en-US")} pcs</span>
                  <Input
                    aria-label={`Unit price for ${it.label}`}
                    inputMode="decimal"
                    value={prices[it.id] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button size="sm" disabled={pending}>
              {pending ? "Creating order..." : "Create order"}
            </Button>
          </form>
        )}
        {!allLinked && error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}