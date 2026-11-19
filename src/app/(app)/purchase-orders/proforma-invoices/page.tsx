import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Inbox, List, Plus, Save } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { prisma } from "@/lib/prisma";
import { requireUser, can } from "@/lib/permissions";
import { poService } from "@/services/po.service";
import { createProformaInvoiceAction } from "./actions";

const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LABEL = "block text-sm font-semibold text-navy-800";
const FIELD =
  "mt-1.5 h-12 w-full rounded-lg border bg-card px-4 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200";
const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

export default async function ProformaInvoicesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (!can(user, "po.view")) redirect("/dashboard");
  const [orders, rows, params] = await Promise.all([
    poService.list(),
    prisma.supplierPi.findMany({
      where: { po: { companyId: user.companyId } },
      include: { po: { select: { id: true, poNo: true } }, supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    searchParams,
  ]);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <FileText className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Supplier proforma invoices</h1>
              <p className="text-sm text-navy-800">
                Register supplier PI against a purchase order; currency conversion snapshot and audit trail are
                handled by the PO service.
              </p>
            </div>
          </div>
          <a
            href="#register-pi"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Proforma Invoice
          </a>
        </header>
      </PageBand>

      {params.saved === "1" && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Proforma invoice saved.
        </p>
      )}

      <section id="register-pi" className="scroll-mt-6 rounded-card border bg-card p-6 shadow-card">
        <h2 className="mb-5 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          Register PI
        </h2>
        <form action={createProformaInvoiceAction} className="space-y-5">
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <label className={LABEL}>
              Purchase order
              <select required name="poId" className={FIELD}>
                <option value="">Select PO</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.poNo} · {o.supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              PI number
              <input required name="piNo" className={FIELD} />
            </label>
            <label className={LABEL}>
              Amount
              <input required min="0.01" step="0.01" type="number" name="amount" className={FIELD} />
            </label>
            <label className={LABEL}>
              Currency
              <input
                required
                minLength={3}
                maxLength={3}
                defaultValue="USD"
                name="currency"
                className={`${FIELD} uppercase`}
              />
            </label>
            <label className={LABEL}>
              PI date
              <input type="date" name="piDate" className={FIELD} />
            </label>
            <label className={LABEL}>
              Document URL
              <input type="url" name="fileUrl" className={FIELD} placeholder="https://…" />
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Save className="h-4 w-4" />
            Save PI
          </button>
        </form>
      </section>

      <section className="rounded-card border bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <List className="h-5 w-5 text-navy-800" />
          Registered PIs
        </h2>

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} rounded-l-lg text-left`}>PI number</th>
                <th className={`${TH} text-left`}>PO</th>
                <th className={`${TH} text-left`}>Supplier</th>
                <th className={`${TH} text-left`}>Date</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={`${TH} text-right`}>Base amount</th>
                <th className={`${TH} rounded-r-lg text-left`}>Document</th>
              </tr>
            </thead>
            <tbody className="stagger stagger-fast">
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{r.piNo}</td>
                  <td className="px-4 py-3 text-[15px]">
                    {r.po ? (
                      <Link
                        href={`/purchase-orders/${r.po.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {r.po.poNo}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{r.supplier.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">
                    {r.piDate?.toISOString().slice(0, 10) ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] font-medium tabular-nums text-navy-800">
                    {fmt2.format(Number(r.amount))} {r.currency}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                    {r.baseAmount ? `${fmt2.format(Number(r.baseAmount))} ${r.baseCurrency ?? ""}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {r.fileUrl ? (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center rounded-lg bg-blue-50 px-3.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
              <Inbox className="h-9 w-9 animate-float text-slate-300" />
              No PIs registered yet.
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <p className="mt-4 px-1 text-[15px] font-semibold text-navy-800">{rows.length} records</p>
        )}
      </section>
    </div>
  );
}