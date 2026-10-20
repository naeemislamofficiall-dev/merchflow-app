"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveQuotationAction, recommendQuotationAction, rejectQuotationAction } from "./actions";

export type QuotationItem = {
  id: string;
  quotationNo: string;
  revisionNo: number;
  supplier: string;
  material: string;
  unitPrice: string;
  currency: string;
  leadTimeDays: number | null;
  qualityRating: number | null;
  score: number | null;
  status: string;
};

export function QuotationBoard({ rows, scored }: { rows: QuotationItem[]; scored: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>) {
    setError("");
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  function reject(id: string) {
    const reason = window.prompt("Why is this quotation being rejected?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => rejectQuotationAction(id, reason.trim()));
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Quotation</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Lead time</TableHead>
                <TableHead className="text-right">Quality</TableHead>
                {scored && <TableHead className="text-right">Score</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={scored ? 9 : 8} className="h-20 text-center text-muted-foreground">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.quotationNo} <span className="text-xs text-muted-foreground">rev {r.revisionNo}</span>
                    </TableCell>
                    <TableCell>{r.supplier}</TableCell>
                    <TableCell>{r.material}</TableCell>
                    <TableCell className="text-right">
                      {r.unitPrice} {r.currency}
                    </TableCell>
                    <TableCell className="text-right">{r.leadTimeDays !== null ? `${r.leadTimeDays} d` : "-"}</TableCell>
                    <TableCell className="text-right">{r.qualityRating ?? "-"}</TableCell>
                    {scored && <TableCell className="text-right font-medium">{r.score ?? "-"}</TableCell>}
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {r.status === "RECEIVED" && (
                        <Button size="sm" disabled={pending} onClick={() => run(() => recommendQuotationAction(r.id))}>
                          Recommend
                        </Button>
                      )}
                      {r.status === "RECOMMENDED" && (
                        <Button size="sm" disabled={pending} onClick={() => run(() => approveQuotationAction(r.id))}>
                          Approve
                        </Button>
                      )}
                      {(r.status === "RECEIVED" || r.status === "RECOMMENDED") && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(r.id)}>
                          Reject
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}