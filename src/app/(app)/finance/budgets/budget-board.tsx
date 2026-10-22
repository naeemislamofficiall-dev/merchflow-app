"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  approveBudgetAction,
  cancelBudgetAction,
  closeBudgetAction,
  updateBudgetAmountAction,
} from "./actions";

export type BudgetRow = {
  id: string;
  period: string;
  category: string;
  factory: string;
  status: string;
  budget: number;
  actual: number;
  remaining: number;
  usedPct: number | null;
  over: boolean;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function BudgetBoard({
  rows,
  canCreate,
  canApprove,
  canCancel,
}: {
  rows: BudgetRow[];
  canCreate: boolean;
  canApprove: boolean;
  canCancel: boolean;
}) {
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

  function edit(r: BudgetRow) {
    const v = window.prompt("New budget amount", String(r.budget));
    if (v === null) return;
    if (!(Number(v) > 0)) {
      setError("Amount must be more than 0");
      return;
    }
    run(() => updateBudgetAmountAction(r.id, v));
  }

  function cancel(id: string) {
    const reason = window.prompt("Why is this budget being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelBudgetAction(id, reason.trim()));
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Period</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="h-20 text-center text-muted-foreground">
                    No budgets for this year
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.period}</TableCell>
                    <TableCell className="capitalize">{r.category.toLowerCase()}</TableCell>
                    <TableCell>{r.factory}</TableCell>
                    <TableCell className="text-right">{money(r.budget)}</TableCell>
                    <TableCell className="text-right">{money(r.actual)}</TableCell>
                    <TableCell className={`text-right ${r.over ? "text-destructive" : ""}`}>{money(r.remaining)}</TableCell>
                    <TableCell className={`text-right ${r.over ? "text-destructive" : ""}`}>
                      {r.usedPct === null ? "-" : `${r.usedPct}%`}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {r.status === "DRAFT" && canCreate && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => edit(r)}>
                          Edit amount
                        </Button>
                      )}
                      {r.status === "DRAFT" && canApprove && (
                        <Button size="sm" disabled={pending} onClick={() => run(() => approveBudgetAction(r.id))}>
                          Approve
                        </Button>
                      )}
                      {r.status === "APPROVED" && canApprove && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => closeBudgetAction(r.id))}>
                          Close
                        </Button>
                      )}
                      {(r.status === "DRAFT" || r.status === "APPROVED") && canCancel && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => cancel(r.id)}>
                          Cancel
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
