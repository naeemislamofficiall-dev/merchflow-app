"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveLineMatrixAction } from "../actions";

type Cell = { colorId: string; sizeId: string; quantity: number };

export type LineMatrixData = {
  lineId: string;
  styleNo: string;
  styleName: string;
  quantity: number;
  colors: { id: string; code: string; name: string }[];
  sizes: { id: string; label: string }[];
  cells: Cell[];
};

const key = (c: string, s: string) => `${c}|${s}`;
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

function LineCard({ line, locked }: { line: LineMatrixData; locked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(line.cells.map((c) => [key(c.colorId, c.sizeId), String(c.quantity)]))
  );

  const num = (c: string, s: string) => {
    const n = Math.floor(Number(qty[key(c, s)] ?? 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const rowTotal = (c: string) => line.sizes.reduce((t, z) => t + num(c, z.id), 0);
  const colTotal = (s: string) => line.colors.reduce((t, c) => t + num(c.id, s), 0);
  const grand = line.colors.reduce((t, c) => t + rowTotal(c.id), 0);
  const matches = grand === line.quantity;

  function save() {
    const out: Cell[] = [];
    for (const c of line.colors) {
      for (const z of line.sizes) {
        const q = num(c.id, z.id);
        if (q > 0) out.push({ colorId: c.id, sizeId: z.id, quantity: q });
      }
    }
    if (out.length === 0) {
      setMsg({ ok: false, text: "Enter the quantities first" });
      return;
    }
    setMsg(null);
    start(async () => {
      const res = await saveLineMatrixAction(line.lineId, out);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: "Matrix saved" });
      router.refresh();
    });
  }

  const noMatrixPossible = line.colors.length === 0 || line.sizes.length === 0;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{line.styleNo}</p>
          <p className="text-xs text-muted-foreground">{line.styleName}</p>
        </div>
        <p className={matches ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-gold-600"}>
          {fmt(grand)} / {fmt(line.quantity)} {matches ? "✓" : `(${fmt(line.quantity - grand)} to allocate)`}
        </p>
      </div>

      {noMatrixPossible ? (
        <p className="text-sm text-muted-foreground">
          This style has no colors or sizes yet. Add them in the style&apos;s Color / size tab first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Color</th>
                {line.sizes.map((z) => (
                  <th key={z.id} className="px-3 py-2 text-right font-medium">
                    {z.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {line.colors.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">({c.code})</span>
                  </td>
                  {line.sizes.map((z) => (
                    <td key={z.id} className="px-2 py-1.5 text-right">
                      <Input
                        inputMode="numeric"
                        disabled={locked}
                        className="ml-auto h-8 w-20 text-right"
                        value={qty[key(c.id, z.id)] ?? ""}
                        onChange={(e) => setQty((p) => ({ ...p, [key(c.id, z.id)]: e.target.value }))}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium">{fmt(rowTotal(c.id))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50 font-medium">
                <td className="px-3 py-2">Size total</td>
                {line.sizes.map((z) => (
                  <td key={z.id} className="px-3 py-2 text-right">
                    {fmt(colTotal(z.id))}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">{fmt(grand)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!locked && !noMatrixPossible && (
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save matrix"}
          </Button>
        )}
        {msg && <p className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.text}</p>}
      </div>
    </Card>
  );
}

export function LineMatrix({ lines, locked }: { lines: LineMatrixData[]; locked: boolean }) {
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No order lines.</p>;
  return (
    <div className="space-y-4">
      {locked && (
        <p className="text-sm text-muted-foreground">
          The matrix can no longer be edited here. Use an amendment for changes after production starts.
        </p>
      )}
      {lines.map((l) => (
        <LineCard key={l.lineId} line={l} locked={locked} />
      ))}
    </div>
  );
}