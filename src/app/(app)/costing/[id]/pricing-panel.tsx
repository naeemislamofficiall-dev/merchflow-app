"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { setMarginAction, setPriceAction } from "../actions";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const NUM = /^[0-9]+(\.[0-9]{1,4})?$/;

export function PricingPanel({
  sheetId,
  editable,
  currency,
  marginPct,
  totalCost,
  quotedPrice,
}: {
  sheetId: string;
  editable: boolean;
  currency: string;
  marginPct: number;
  totalCost: number;
  quotedPrice: number;
}) {
  const router = useRouter();
  const [margin, setMargin] = useState(String(marginPct));
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function saveMargin() {
    if (!NUM.test(margin) || Number(margin) >= 100) {
      setError("Margin must be a number below 100");
      return;
    }
    setError("");
    start(async () => {
      const res = await setMarginAction(sheetId, Number(margin));
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function savePrice() {
    if (!NUM.test(price) || Number(price) <= 0) {
      setError("Enter the selling price as a number above 0");
      return;
    }
    setError("");
    start(async () => {
      const res = await setPriceAction(sheetId, Number(price));
      if (!res.ok) setError(res.error);
      else {
        setPrice("");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total cost</span>
            <span>
              {currency} {fmt(totalCost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin</span>
            <span>{marginPct}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit per piece</span>
            <span>
              {currency} {fmt(quotedPrice - totalCost)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Quoted price</span>
            <span>
              {currency} {fmt(quotedPrice)}
            </span>
          </div>
        </div>

        {editable && (
          <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
            <div className="space-y-2">
              <FormField label="Set margin %" htmlFor="pp-margin">
                <Input id="pp-margin" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
              </FormField>
              <Button size="sm" variant="outline" disabled={pending} onClick={saveMargin}>
                Apply margin
              </Button>
            </div>
            <div className="space-y-2">
              <FormField label="Or set selling price" htmlFor="pp-price" hint="The margin is worked out for you">
                <Input id="pp-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </FormField>
              <Button size="sm" variant="outline" disabled={pending} onClick={savePrice}>
                Apply price
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}