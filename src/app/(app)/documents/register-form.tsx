"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { registerDocumentAction } from "./actions";

const ENTITY_TYPES = ["Supplier", "Buyer", "Order", "Style", "Material", "PurchaseOrder", "Shipment", "Factory"];

export function RegisterForm() {
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
      const res = await registerDocumentAction({
        entityType: get("entityType"),
        entityId: get("entityId"),
        fileName: get("fileName"),
        docType: get("docType"),
        storageUrl: get("storageUrl"),
        expiryDate: get("expiryDate"),
        access: get("access"),
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
          <CardTitle>Register a document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Belongs to" htmlFor="doc-etype" required>
              <Input id="doc-etype" name="entityType" list="entity-types" placeholder="Supplier" />
              <datalist id="entity-types">
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Record id" htmlFor="doc-eid" required hint="The id from the record's page address">
              <Input id="doc-eid" name="entityId" />
            </FormField>
            <FormField label="Document name" htmlFor="doc-name" required>
              <Input id="doc-name" name="fileName" placeholder="BSCI-certificate-2026.pdf" />
            </FormField>
            <FormField label="Kind" htmlFor="doc-kind" hint="Certificate, Contract...">
              <Input id="doc-kind" name="docType" maxLength={60} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="File link" htmlFor="doc-url" hint="Drive / SharePoint / any web link">
                <Input id="doc-url" name="storageUrl" type="url" placeholder="https://..." />
              </FormField>
            </div>
            <FormField label="Expiry date" htmlFor="doc-exp">
              <Input id="doc-exp" name="expiryDate" type="date" />
            </FormField>
            <FormField label="Who can see" htmlFor="doc-acc">
              <Select id="doc-acc" name="access" defaultValue="COMPANY">
                <option value="COMPANY">Whole company</option>
                <option value="FACTORY">Factory</option>
                <option value="PRIVATE">Only me</option>
              </Select>
            </FormField>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Register"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}