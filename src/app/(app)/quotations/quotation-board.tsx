"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
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

const PAGE_SIZE = 10;

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  RECEIVED: { label: "Received", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  RECOMMENDED: { label: "Recommended", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  APPROVED: { label: "Approved", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", pill: "bg-rose-100 text-rose-600", dot: "bg-rose-500" },
};
const stOf = (s: string) =>
  ST[s] ?? {
    label: s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    pill: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  };

function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

export function QuotationBoard({ rows, scored }: { rows: QuotationItem[]; scored: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

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
    <section className="rounded-card border bg-card p-5 shadow-card">
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className={cn(TH, "rounded-l-lg text-left")}>Quotation</th>
              <th className={cn(TH, "text-left")}>Supplier</th>
              <th className={cn(TH, "text-left")}>Material</th>
              <th className={cn(TH, "text-right")}>Unit price</th>
              <th className={cn(TH, "text-right")}>Lead time</th>
              <th className={cn(TH, "text-right")}>Quality</th>
              {scored && <th className={cn(TH, "text-right")}>Score</th>}
              <th className={cn(TH, "text-left")}>Status</th>
              <th className={cn(TH, "rounded-r-lg text-right")}>Action</th>
            </tr>
          </thead>
          <tbody key={`${cur}-${rows.length}`} className="stagger stagger-fast">
            {shown.map((r) => {
              const S = stOf(r.status);
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] font-semibold text-navy-800">
                    {r.quotationNo} <span className="text-xs font-normal text-slate-500">rev {r.revisionNo}</span>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.supplier}</td>
                  <td className="px-4 py-3 text-[15px] font-medium text-navy-800">{r.material}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium tabular-nums text-navy-800">
                    {r.unitPrice} {r.currency}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.leadTimeDays !== null ? `${r.leadTimeDays} days` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.qualityRating ?? "-"}
                  </td>
                  {scored && (
                    <td className="px-4 py-3 text-right text-[15px] font-semibold tabular-nums text-navy-800">
                      {r.score ?? "-"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold",
                        S.pill
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", S.dot)} />
                      {S.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-2">
                      {r.status === "RECEIVED" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => recommendQuotationAction(r.id))}
                          className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          Recommend
                        </button>
                      )}
                      {r.status === "RECOMMENDED" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => approveQuotationAction(r.id))}
                          className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                      )}
                      {(r.status === "RECEIVED" || r.status === "RECOMMENDED") && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => reject(r.id)}
                          className="inline-flex h-8 items-center rounded-lg border bg-card px-3.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
            <Inbox className="h-9 w-9 animate-float text-slate-300" />
            No quotations found
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] font-semibold text-navy-800">
            {rows.length} quotations · Page {cur} of {pages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={cur === 1}
              onClick={() => setPage(cur - 1)}
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageList(cur, pages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === cur ? "page" : undefined}
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium",
                    p === cur ? "border-blue-600 bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={cur === pages}
              onClick={() => setPage(cur + 1)}
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}