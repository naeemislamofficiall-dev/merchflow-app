"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, Plus } from "lucide-react";
import { DOC_TYPES, DOC_TYPE_LABEL } from "@/lib/export-doc-types";
import { ClipboardArt } from "@/components/commercial/export-art";
import { createDocAction } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-800">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

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
    <form
      id="add-document"
      onSubmit={onSubmit}
      className="relative scroll-mt-6 overflow-hidden rounded-card border border-l-4 border-slate-100 border-l-blue-600 bg-white p-6 shadow-card"
    >
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FilePlus className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-heading text-xl font-semibold text-navy-800">Add document</h2>
              <p className="text-sm text-slate-500">Fill in the details to export your shipping documents</p>
            </div>
          </div>

          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Type" htmlFor="doc-type" required>
              <select id="doc-type" name="docType" defaultValue="COMMERCIAL_INVOICE" className={field}>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Document no" htmlFor="doc-no">
              <input id="doc-no" name="docNo" maxLength={60} placeholder="Enter document number..." className={field} />
            </Field>
            <Field label="Shipment" htmlFor="doc-ship">
              <select id="doc-ship" name="shipmentId" className={field}>
                <option value="">Select shipment...</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Issue date" htmlFor="doc-date">
              <input id="doc-date" name="issueDate" type="date" className={field} />
            </Field>
            <Field label="Amount" htmlFor="doc-amount">
              <input id="doc-amount" name="amount" inputMode="decimal" placeholder="Enter amount..." className={field} />
            </Field>
            <Field label="Currency" htmlFor="doc-cur" hint="3 letters, e.g. USD">
              <input id="doc-cur" name="currency" maxLength={3} defaultValue="USD" className={field} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Remarks" htmlFor="doc-rem">
                <input id="doc-rem" name="remarks" maxLength={500} placeholder="Enter remarks..." className={field} />
              </Field>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> {pending ? "Saving..." : "Add document"}
          </button>
        </div>

        <ClipboardArt className="hidden h-44 w-44 shrink-0 xl:block" />
      </div>
    </form>
  );
}