"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addRfqSupplierAction, removeRfqSupplierAction } from "../actions";

type Item = { supplierId: string; name: string; sentAt: string };

export function RfqSuppliers({
  rfqId,
  editable,
  current,
  available,
}: {
  rfqId: string;
  editable: boolean;
  current: Item[];
  available: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pick, setPick] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Supplier</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  No suppliers yet. Add at least one before sending.
                </TableCell>
              </TableRow>
            ) : (
              current.map((s) => (
                <TableRow key={s.supplierId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.sentAt || "-"}</TableCell>
                  <TableCell className="text-right">
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => removeRfqSupplierAction(rfqId, s.supplierId))}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {editable && (
          <div className="flex items-center gap-2 border-t p-4">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="Supplier to add"
            >
              <option value="">Add a supplier...</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={pending || !pick}
              onClick={() => run(() => addRfqSupplierAction(rfqId, pick), () => setPick(""))}
            >
              Add
            </Button>
          </div>
        )}
        {error && <p className="px-4 pb-4 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}