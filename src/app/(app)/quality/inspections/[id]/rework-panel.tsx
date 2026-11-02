"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addReworkAction } from "../actions";

export type ReworkRow = { id: string; defectName: string; quantity: number; repaired: number; rejected: number; balance: number };

const input = "h-8 w-20 rounded-md border bg-background px-2 text-sm";

export function ReworkPanel({ rows }: { rows: ReworkRow[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, { r: string; j: string }>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(id: string) {
    const v = vals[id] ?? { r: "", j: "" };
    setError("");
    start(async () => {
      const res = await addReworkAction({ occurrenceId: id, repairedQty: v.r, rejectedQty: v.j });
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setVals((p) => ({ ...p, [id]: { r: "", j: "" } }));
        router.refresh();
      }
    });
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Rework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 && <p className="text-muted-foreground">No defects to rework.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 border-b pb-2">
            <span className="w-48 font-medium">{r.defectName}</span>
            <span className="text-muted-foreground">
              Found {r.quantity} · repaired {r.repaired} · rejected {r.rejected} · open {r.balance}
            </span>
            {r.balance > 0 && (
              <>
                <input className={input} placeholder="Repaired" value={vals[r.id]?.r ?? ""} onChange={(e) => setVals((p) => ({ ...p, [r.id]: { r: e.target.value, j: p[r.id]?.j ?? "" } }))} />
                <input className={input} placeholder="Rejected" value={vals[r.id]?.j ?? ""} onChange={(e) => setVals((p) => ({ ...p, [r.id]: { r: p[r.id]?.r ?? "", j: e.target.value } }))} />
                <Button size="sm" disabled={pending} onClick={() => save(r.id)}>Save</Button>
              </>
            )}
          </div>
        ))}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}