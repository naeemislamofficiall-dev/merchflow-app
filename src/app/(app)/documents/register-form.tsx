"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { registerDocumentAction } from "./actions";

const ENTITY_TYPES = ["Supplier", "Buyer", "Order", "Style", "Material", "PurchaseOrder", "Shipment", "Factory"];

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const lbl = "block text-sm font-semibold text-navy-800";
const hint = "text-xs text-slate-500";

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
    <form
      id="register-document"
      onSubmit={onSubmit}
      className="scroll-mt-6 space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <FilePlus2 className="h-5 w-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-navy-800">Register a Document</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="doc-etype" className={lbl}>
            Belongs to <span className="text-red-500">*</span>
          </label>
          <input id="doc-etype" name="entityType" list="entity-types" placeholder="Supplier" className={field} />
          <datalist id="entity-types">
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-eid" className={lbl}>
            Record id <span className="text-red-500">*</span>
          </label>
          <input id="doc-eid" name="entityId" className={field} />
          <p className={hint}>The id from the record&apos;s page address</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-name" className={lbl}>
            Document name <span className="text-red-500">*</span>
          </label>
          <input id="doc-name" name="fileName" placeholder="BSCI-certificate-2026.pdf" className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-kind" className={lbl}>
            Kind
          </label>
          <input id="doc-kind" name="docType" maxLength={60} className={field} />
          <p className={hint}>Certificate, Contract...</p>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="doc-url" className={lbl}>
            File link
          </label>
          <input id="doc-url" name="storageUrl" type="url" placeholder="https://..." className={field} />
          <p className={hint}>Drive / SharePoint / any web link</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-exp" className={lbl}>
            Expiry date
          </label>
          <input id="doc-exp" name="expiryDate" type="date" className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-acc" className={lbl}>
            Who can see
          </label>
          <select id="doc-acc" name="access" defaultValue="COMPANY" className={field}>
            <option value="COMPANY">Whole company</option>
            <option value="FACTORY">Factory</option>
            <option value="PRIVATE">Only me</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Register"}
      </button>
    </form>
  );
}