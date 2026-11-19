"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Clock, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScanArt } from "@/components/inventory/scan-art";
import { labelAction, resolveScanAction, type LabelData } from "./actions";

type Found = { type: string; id: string; label: string };

// ধরন অনুযায়ী আসল পেজ। Roll, Lot, Bundle-এর আলাদা detail পেজ এখনো নেই, তাই তালিকা পেজে যায়
const HREF: Record<string, (id: string) => string> = {
  ROLL: (id) => `/fabric-rolls/${id}`,
  LOT: (id) => `/inventory/lots/${id}`,
  BUNDLE: (id) => `/cutting/bundles/${id}`,
  PRODUCTION_ORDER: (id) => `/production-orders/${id}`,
  CARTON: (id) => `/packing/cartons/${id}`,
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export function Scanner() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Found | null>(null);
  const [history, setHistory] = useState<Found[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    setError("");
    start(async () => {
      const res = await resolveScanAction(raw);
      if (!res.ok) {
        setResult(null);
        setError(res.error);
      } else {
        const f = { type: res.data.type, id: res.data.id, label: res.data.label };
        setResult(f);
        setHistory((h) => [f, ...h.filter((x) => !(x.type === f.type && x.id === f.id))].slice(0, 5));
      }
      setValue("");
      inputRef.current?.focus();
    });
  }

  function printLabel(f: Found) {
    setError("");
    start(async () => {
      // LOT-এর লেবেল lot id দিয়ে, বাকিগুলো নম্বর দিয়ে
      const res = await labelAction(f.type, f.type === "LOT" ? f.id : f.label);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      openPrint(res.data);
    });
  }

  function openPrint(l: LabelData) {
    const w = window.open("", "_blank", "width=420,height=520");
    if (!w) {
      setError("Allow pop-ups to print the label");
      return;
    }
    w.document.write(
      `<html><head><title>${esc(l.title)}</title></head>` +
        `<body style="font-family:sans-serif;text-align:center;margin:16px">` +
        `<img src="${l.qrDataUrl}" width="200" height="200" alt="QR"/>` +
        `<h2 style="margin:8px 0">${esc(l.title)}</h2>` +
        l.lines.map((x) => `<p style="margin:2px 0">${esc(x)}</p>`).join("") +
        `<script>window.onload=function(){window.print()}<\/script></body></html>`
    );
    w.document.close();
  }

  const canLabel = result && ["ROLL", "LOT", "BUNDLE"].includes(result.type);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
            <ScanArt className="h-6 w-6" /> Scan or type
          </h2>
          <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter roll number or scan barcode..."
              autoComplete="off"
              aria-label="Scan code"
              className="h-12 min-w-56 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} /> {pending ? "..." : "Find"}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Format: <span className="font-mono">MF:ROLL:FAB-LOT22-R0047</span> or <span className="font-mono">R-1024</span>
          </p>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </section>

        <section className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
            <Clock className="h-5 w-5 text-blue-600" /> Recent scans
          </h2>
          {history.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Clock className="h-6 w-6" />
              </span>
              <p className="text-sm text-slate-500">Nothing scanned yet</p>
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-1.5 text-sm">
                {history.map((h) => (
                  <li key={`${h.type}:${h.id}`}>
                    <button className="font-medium text-denim-700 hover:underline" onClick={() => setResult(h)}>
                      {h.label}
                    </button>{" "}
                    <span className="text-xs text-slate-500">{h.type.replace(/_/g, " ").toLowerCase()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">This session only</p>
            </>
          )}
        </section>
      </div>

      {result ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-blue-100 bg-blue-50/50 p-5 shadow-card">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {result.type.replace(/_/g, " ").toLowerCase()}
            </p>
            <p className="font-heading text-2xl font-semibold text-navy-800">{result.label}</p>
          </div>
          <div className="flex gap-2">
            <Link href={(HREF[result.type] ?? (() => "/"))(result.id)} className={buttonVariants()}>
              Open
            </Link>
            {canLabel && (
              <Button variant="outline" disabled={pending} onClick={() => printLabel(result)}>
                Print label
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center gap-1 px-4 py-14 text-center">
          <ScanArt className="mb-3 h-24 w-24 animate-float" />
          <p className="text-2xl font-semibold text-navy-800">Scan or enter a roll number</p>
          <p className="text-slate-500">Use the scanner or type the roll number to view details</p>
          <span className="mt-4 h-0.5 w-16 rounded-full bg-blue-500" />
        </div>
      )}
    </div>
  );
}