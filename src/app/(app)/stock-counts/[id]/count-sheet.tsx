"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  cancelStockCountAction,
  generateCountLinesAction,
  postStockCountAction,
  saveCountsAction,
} from "../actions";

export type CountLine = {
  id: string;
  materialCode: string;
  materialName: string;
  lotNo: string;
  rollNo: string;
  binCode: string;
  unit: string;
  systemQty: number;
  countedQty: number | null;
};

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

export function CountSheet({
  id,
  status,
  lines,
  canCount,
  canPost,
  canCreate,
  canCancel,
}: {
  id: string;
  status: string;
  lines: CountLine[];
  canCount: boolean;
  canPost: boolean;
  canCreate: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, l.countedQty === null ? "" : String(l.countedQty)]))
  );

  const isDraft = status === "DRAFT";
  const editable = isDraft && canCount && lines.length > 0;
  const payload = () => lines.map((l) => ({ lineId: l.id, countedQty: values[l.id] ?? "" }));

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function generate() {
    if (lines.length > 0 && !window.confirm("Regenerate the lines? Quantities you already entered will be cleared.")) return;
    setValues({});
    run(() => generateCountLinesAction(id));
  }

  function post() {
    if (!window.confirm("Post this count? Book stock will be changed to match what you counted.")) return;
    setError("");
    start(async () => {
      const saved = await saveCountsAction(id, payload());
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      const res = await postStockCountAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function cancel() {
    const reason = window.prompt("Why is this count being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelStockCountAction(id, reason.trim()));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isDraft && canCreate && (
          <Button variant={lines.length === 0 ? "default" : "outline"} disabled={pending} onClick={generate}>
            Generate lines from current stock
          </Button>
        )}
        {editable && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => saveCountsAction(id, payload()))}>
            Save counts
          </Button>
        )}
        {isDraft && canPost && lines.length > 0 && (
          <Button variant="gold" disabled={pending} onClick={post}>
            Post count
          </Button>
        )}
        {isDraft && canCancel && (
          <Button variant="outline" disabled={pending} onClick={cancel}>
            Cancel count
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead className="text-right">Book qty</TableHead>
                <TableHead className="w-40 text-right">Counted</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    {isDraft ? "Generate lines to start counting" : "No lines"}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((l) => {
                  const typed = values[l.id] ?? "";
                  const counted = editable
                    ? typed.trim() === "" || !Number.isFinite(Number(typed))
                      ? null
                      : Number(typed)
                    : l.countedQty;
                  const diff = counted === null ? null : counted - l.systemQty;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <span className="font-medium">{l.materialCode}</span> {l.materialName}
                      </TableCell>
                      <TableCell>{l.lotNo || "-"}</TableCell>
                      <TableCell>{l.rollNo || "-"}</TableCell>
                      <TableCell>{l.binCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        {fmt(l.systemQty)} {l.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {editable ? (
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            className="text-right"
                            value={typed}
                            onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))}
                          />
                        ) : l.countedQty === null ? (
                          "-"
                        ) : (
                          `${fmt(l.countedQty)} ${l.unit}`
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right ${diff !== null && Math.abs(diff) > 0.00005 ? (diff < 0 ? "text-destructive" : "text-emerald-700") : ""}`}
                      >
                        {diff === null ? "-" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
