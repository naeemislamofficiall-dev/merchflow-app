"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Scan or type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="MF:ROLL:FAB-LOT22-R0047  or  R-1024"
              autoComplete="off"
              aria-label="Scan code"
            />
            <Button disabled={pending}>{pending ? "..." : "Find"}</Button>
          </form>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {result.type.replace(/_/g, " ").toLowerCase()}
                </p>
                <p className="text-lg font-semibold">{result.label}</p>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scanned yet</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {history.map((h) => (
                <li key={`${h.type}:${h.id}`}>
                  <button className="text-denim-700 hover:underline" onClick={() => setResult(h)}>
                    {h.label}
                  </button>{" "}
                  <span className="text-xs text-muted-foreground">{h.type.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}