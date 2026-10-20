"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveExpenseAction, cancelExpenseAction } from "../actions";

export type ExpenseItem = {
  id: string;
  expenseNo: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  order: string;
  status: string;
};

export function ExpenseBoard({ rows }: { rows: ExpenseItem[] }) {
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

  function cancel(id: string) {
    const reason = window.prompt("Why is this expense being cancelled?");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("A reason is required (at least 3 characters)");
      return;
    }
    run(() => cancelExpenseAction(id, reason.trim()));
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Expense</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No expenses yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.expenseNo}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="capitalize">{r.category}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.order || "-"}</TableCell>
                    <TableCell className="text-right">
                      {r.amount} {r.currency}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {r.status === "DRAFT" && (
                        <>
                          <Button size="sm" disabled={pending} onClick={() => run(() => approveExpenseAction(r.id))}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => cancel(r.id)}>
                            Cancel
                          </Button>
                        </>
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