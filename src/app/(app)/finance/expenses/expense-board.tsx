"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/detail/status-badge";
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

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

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
    <section className="rounded-card border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
        <span className="h-6 w-1 rounded-full bg-blue-600" />
        Expenses List
      </h2>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Expense</th>
              <th className={cn(TH, "text-left")}>Date</th>
              <th className={cn(TH, "text-left")}>Category</th>
              <th className={cn(TH, "text-left")}>Description</th>
              <th className={cn(TH, "text-left")}>Order</th>
              <th className={cn(TH, "text-right")}>Amount</th>
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody className="stagger stagger-fast">
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{r.expenseNo}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">{r.date}</td>
                <td className="px-4 py-3 text-[15px] capitalize text-navy-800">{r.category}</td>
                <td className="px-4 py-3 text-[15px] text-navy-800">{r.description}</td>
                <td className="px-4 py-3 text-[15px] text-navy-800">{r.order || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium text-navy-800">
                  {r.amount} {r.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center justify-end gap-2">
                    {r.status === "DRAFT" && (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => approveExpenseAction(r.id))}
                          className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => cancel(r.id)}
                          className="inline-flex h-8 items-center rounded-lg border bg-card px-3.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            No expenses yet
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}