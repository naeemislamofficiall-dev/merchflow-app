import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, Info, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { materialIssueService } from "@/services/material-issue.service";
import { createMaterialReturnAction } from "./actions";

const TZ = "Asia/Dhaka";

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const HEAD = ["Return No.", "Issue", "Reason", "Lines", "Date"];

// SHUDHU SAJANO: empty state-er chhobi (document + return arrow). Kono data nei.
function ReturnsEmptyArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
      <rect x="8" y="6" width="38" height="46" rx="6" fill="#cbd5e1" />
      <g fill="#f1f5f9">
        <rect x="14" y="16" width="5" height="5" rx="1.5" />
        <rect x="14" y="27" width="5" height="5" rx="1.5" />
        <rect x="14" y="38" width="5" height="5" rx="1.5" />
        <rect x="23" y="17" width="16" height="3" rx="1.5" />
        <rect x="23" y="28" width="16" height="3" rx="1.5" />
        <rect x="23" y="39" width="10" height="3" rx="1.5" />
      </g>
      <circle cx="46" cy="44" r="13" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" />
      <path
        d="M52 44a6 6 0 1 1-2-4.5"
        fill="none"
        stroke="#64748b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M50 35v5h-5"
        fill="none"
        stroke="#64748b"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function MaterialReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) redirect("/dashboard");

  const [issues, returns, params] = await Promise.all([
    materialIssueService.list(),
    prisma.materialReturn.findMany({
      where: { companyId: user.companyId },
      include: { issue: { select: { issueNo: true } }, lines: true },
      orderBy: { returnedAt: "desc" },
      take: 50,
    }),
    searchParams,
  ]);
  const lineDetails = await Promise.all(
    issues.map(async (issue) => ({ issue, detail: (await materialIssueService.get(issue.id))! }))
  );

  return (
    <div className="stagger space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-navy-800">Material returns</h1>
          <p className="mt-1 text-sm text-slate-500">
            Return unused material to store; the service enforces that returned quantity cannot exceed
            issued balance.
          </p>
        </div>
        <Link
          href="#new-return"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New Return
        </Link>
      </header>

      {params.saved === "1" && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4 shrink-0" /> Material return posted and stock transaction recorded.
        </p>
      )}

      <div id="new-return" className="scroll-mt-6 space-y-3">
        {issues.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-4 text-sm text-navy-800 shadow-card">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Info className="h-4 w-4" strokeWidth={3} />
            </span>
            No material issues available to return.
          </div>
        )}

        {lineDetails.map(({ issue, detail }) => (
          <section key={issue.id} className="rounded-card border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-semibold text-navy-800">{issue.issueNo}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {detail.lines.map((line) => {
                const remaining = Number(line.quantity) - Number(line.returnedQty);
                const closed = remaining <= 0;
                return (
                  <form
                    key={line.id}
                    action={createMaterialReturnAction}
                    className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input type="hidden" name="issueLineId" value={line.id} />

                    <p className="text-sm text-slate-600">
                      Material ID: <span className="font-mono text-navy-800">{line.materialId}</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                        <p className="text-xs text-slate-500">Issued</p>
                        <p className="font-semibold tabular-nums text-navy-800">{Number(line.quantity)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                        <p className="text-xs text-slate-500">Returned</p>
                        <p className="font-semibold tabular-nums text-navy-800">{Number(line.returnedQty)}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2 ring-1 ring-blue-100">
                        <p className="text-xs text-blue-700">Balance</p>
                        <p className="font-semibold tabular-nums text-blue-700">{remaining}</p>
                      </div>
                    </div>

                    <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
                      Return quantity
                      <input
                        required
                        type="number"
                        min="0.0001"
                        max={Math.max(remaining, 0)}
                        step="0.0001"
                        name="quantity"
                        className={field}
                        disabled={closed}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
                      Reason
                      <input
                        required
                        minLength={3}
                        name="reason"
                        className={field}
                        placeholder="Unused material"
                        disabled={closed}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
                      Remarks
                      <input name="remarks" className={field} disabled={closed} />
                    </label>
                    <button
                      disabled={closed}
                      className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Record return
                    </button>
                  </form>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-navy-800">Recent returns</h2>
        <div className="overflow-x-auto rounded-card border border-slate-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {HEAD.map((x) => (
                  <th key={x} className="px-6 py-4 text-left font-semibold text-navy-800">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40">
                  <td className="px-6 py-3">{r.returnNo}</td>
                  <td className="px-6 py-3">{r.issue.issueNo}</td>
                  <td className="px-6 py-3">{r.reason}</td>
                  <td className="px-6 py-3 tabular-nums">{r.lines.length}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    {r.returnedAt.toLocaleDateString("en-CA", { timeZone: TZ })}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr>
                  <td colSpan={HEAD.length} className="px-6 py-12">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="mb-2 animate-float">
                        <ReturnsEmptyArt />
                      </span>
                      <p className="text-lg font-semibold text-navy-800">No returns recorded.</p>
                      <p className="text-sm text-slate-500">When material is returned, it will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}