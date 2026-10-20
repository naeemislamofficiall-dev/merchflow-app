"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { DOC_TYPES, DOC_TYPE_LABEL } from "@/lib/export-doc-types";
import { createDocAction } from "./actions";

export function DocForm({ shipments }: { shipments: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "");
    setError("");
    start(async () => {
      const res = await createDocAction({
        docType: get("docType"),
        docNo: get("docNo"),
        shipmentId: get("shipmentId"),
        issueDate: get("issueDate"),
        amount: get("amount"),
        currency: get("currency"),
        remarks: get("remarks"),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Add document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Type" htmlFor="doc-type" required>
              <Select id="doc-type" name="docType" defaultValue="COMMERCIAL_INVOICE">
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Document no" htmlFor="doc-no">
              <Input id="doc-no" name="docNo" maxLength={60} />
            </FormField>
            <FormField label="Shipment" htmlFor="doc-ship">
              <Select id="doc-ship" name="shipmentId">
                <option value="">None</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Issue date" htmlFor="doc-date">
              <Input id="doc-date" name="issueDate" type="date" />
            </FormField>
            <FormField label="Amount" htmlFor="doc-amount">
              <Input id="doc-amount" name="amount" inputMode="decimal" />
            </FormField>
            <FormField label="Currency" htmlFor="doc-cur" hint="3 letters, e.g. USD">
              <Input id="doc-cur" name="currency" maxLength={3} defaultValue="USD" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Remarks" htmlFor="doc-rem">
                <Input id="doc-rem" name="remarks" maxLength={500} />
              </FormField>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Add document"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}