"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addColorAction,
  addSizeAction,
  removeColorAction,
  removeSizeAction,
  saveMatrixAction,
} from "../actions";

type ColorItem = { id: string; code: string; name: string };
type SizeItem = { id: string; label: string };
type Cell = { colorId: string; sizeId: string; quantity: number };

const key = (colorId: string, sizeId: string) => `${colorId}|${sizeId}`;
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export function MatrixEditor({
  styleId,
  colors,
  sizes,
  cells,
  locked,
}: {
  styleId: string;
  colors: ColorItem[];
  sizes: SizeItem[];
  cells: Cell[];
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(cells.map((c) => [key(c.colorId, c.sizeId), String(c.quantity)]))
  );
  const [colorCode, setColorCode] = useState("");
  const [colorName, setColorName] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");

  const num = (colorId: string, sizeId: string) => {
    const n = Math.floor(Number(qty[key(colorId, sizeId)] ?? 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const colorTotal = (cid: string) => sizes.reduce((s, z) => s + num(cid, z.id), 0);
  const sizeTotal = (sid: string) => colors.reduce((s, c) => s + num(c.id, sid), 0);
  const grand = colors.reduce((s, c) => s + colorTotal(c.id), 0);

  // কোনো action চালিয়ে ফল দেখায়, সফল হলে পেজ রিফ্রেশ করে
  function run(fn: () => Promise<{ ok: boolean } & Record<string, unknown>>, okText: string, after?: () => void) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setMsg({ ok: false, text: String(res.error ?? "Failed") });
        return;
      }
      setMsg({ ok: true, text: okText });
      after?.();
      router.refresh();
    });
  }

  function save() {
    const out: Cell[] = [];
    for (const c of colors) for (const z of sizes) out.push({ colorId: c.id, sizeId: z.id, quantity: num(c.id, z.id) });
    run(() => saveMatrixAction(styleId, out), "Matrix saved");
  }

  return (
    <div className="space-y-4">
      {!locked && (
        <Card className="grid gap-3 p-4 md:grid-cols-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-24">
              <p className="mb-1 text-xs text-muted-foreground">Color code</p>
              <Input value={colorCode} onChange={(e) => setColorCode(e.target.value)} placeholder="BLK" />
            </div>
            <div className="min-w-32 flex-1">
              <p className="mb-1 text-xs text-muted-foreground">Color name</p>
              <Input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Black" />
            </div>
            <Button
              variant="secondary"
              disabled={pending || !colorCode.trim() || !colorName.trim()}
              onClick={() =>
                run(() => addColorAction(styleId, colorCode, colorName), "Color added", () => {
                  setColorCode("");
                  setColorName("");
                })
              }
            >
              Add color
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-32 flex-1">
              <p className="mb-1 text-xs text-muted-foreground">Size label</p>
              <Input value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} placeholder="M" />
            </div>
            <Button
              variant="secondary"
              disabled={pending || !sizeLabel.trim()}
              onClick={() => run(() => addSizeAction(styleId, sizeLabel), "Size added", () => setSizeLabel(""))}
            >
              Add size
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {colors.length === 0 || sizes.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Add at least one color and one size to build the matrix.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Color</th>
                {sizes.map((z) => (
                  <th key={z.id} className="px-3 py-2 text-right font-medium">
                    {z.label}
                    {!locked && (
                      <button
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        title="Remove size"
                        onClick={() => {
                          if (window.confirm(`Remove size ${z.label}?`)) run(() => removeSizeAction(z.id), "Size removed");
                        }}
                      >
                        ×
                      </button>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">({c.code})</span>
                    {!locked && (
                      <button
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        title="Remove color"
                        onClick={() => {
                          if (window.confirm(`Remove color ${c.name}?`)) run(() => removeColorAction(c.id), "Color removed");
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                  {sizes.map((z) => (
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
                  <td className="px-3 py-2 text-right font-medium">{fmt(colorTotal(c.id))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50 font-medium">
                <td className="px-3 py-2">Size total</td>
                {sizes.map((z) => (
                  <td key={z.id} className="px-3 py-2 text-right">
                    {fmt(sizeTotal(z.id))}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">{fmt(grand)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <div className="flex items-center gap-3">
        {!locked && colors.length > 0 && sizes.length > 0 && (
          <Button disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save matrix"}
          </Button>
        )}
        {msg && <p className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.text}</p>}
      </div>
    </div>
  );
}