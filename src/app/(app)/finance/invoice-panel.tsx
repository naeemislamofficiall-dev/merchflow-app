"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import {
  cancelPayableAction,
  cancelReceivableAction,
  matchPayableAction,
  payPayableAction,
  postPayableAction,
  postReceivableAction,
  receiveReceivableAction,
} from "./actions";

type PayValues = {
  amount: string;
  paymentDate: string;
  method: string;
  referenceNo: string;
  remarks: string;
};

const METHODS = ["BANK", "CASH", "CHEQUE", "LC", "MOBILE"];

export function InvoicePanel({
  kind,
  invoiceId,
  status,
  hasPo,
  outstanding,
}: {
  kind: "ap" | "ar";
  invoiceId: string;
  status: string;
  hasPo: boolean;
  outstanding: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset } = useForm<PayValues>({
    defaultValues: {
      amount: outstanding > 0 ? String(outstanding) : "",
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "BANK",
      referenceNo: "",
      remarks: "",
    },
  });

  const isAp = kind === "ap";
  const canPay = status === "POSTED" || status === "PARTIALLY_PAID";

  function post() {
    setError("");
    start(async () => {
      let res = isAp ? await postPayableAction(invoiceId) : await postReceivableAction(invoiceId);
      // PO-র সাথে না মিললে ওভাররাইড কারণ চাওয়া হয়
      if (!res.ok && isAp && /override/i.test(res.error)) {
        const reason = window.prompt(`${res.error}\n\nType an override reason to post anyway (at least 3 characters).`);
        if (reason && reason.trim().length >= 3) res = await postPayableAction(invoiceId, reason.trim());
      }
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function match() {
    setError("");
    start(async () => {
      const res = await matchPayableAction(invoiceId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this invoice being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    setError("");
    start(async () => {
      const res = isAp
        ? await cancelPayableAction(invoiceId, reason.trim())
        : await cancelReceivableAction(invoiceId, reason.trim());
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function pay(v: PayValues) {
    setError("");
    const amount = Number(v.amount);
    if (!(amount > 0)) {
      setError("Amount must be more than 0");
      return;
    }
    if (amount > outstanding + 0.005) {
      setError(`Amount cannot be more than the outstanding ${outstanding}`);
      return;
    }
    if (!v.paymentDate) {
      setError("Select the date");
      return;
    }
    start(async () => {
      const res = isAp ? await payPayableAction(invoiceId, v) : await receiveReceivableAction(invoiceId, v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  if (status === "PAID" || status === "CANCELLED") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{status === "DRAFT" ? "Next steps" : isAp ? "Record a payment" : "Record a receipt"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "DRAFT" && (
          <div className="flex flex-wrap gap-2">
            {isAp && hasPo && (
              <Button size="sm" variant="outline" disabled={pending} onClick={match}>
                Match with PO / GRN
              </Button>
            )}
            <Button size="sm" disabled={pending} onClick={post}>
              Post invoice
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
              Cancel
            </Button>
          </div>
        )}

        {canPay && (
          <form onSubmit={handleSubmit(pay)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Amount" htmlFor="p-amount" required hint={`Outstanding ${outstanding}`}>
                <Input id="p-amount" type="number" step="any" min="0" {...register("amount")} />
              </FormField>
              <FormField label="Date" htmlFor="p-date" required>
                <Input id="p-date" type="date" {...register("paymentDate")} />
              </FormField>
              <FormField label="Method" htmlFor="p-method">
                <Select id="p-method" {...register("method")}>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.toLowerCase()}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Reference no" htmlFor="p-ref">
                <Input id="p-ref" maxLength={60} {...register("referenceNo")} />
              </FormField>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending}>
                {isAp ? "Record payment" : "Record receipt"}
              </Button>
              {status === "POSTED" && (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={cancel}>
                  Cancel invoice
                </Button>
              )}
            </div>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}