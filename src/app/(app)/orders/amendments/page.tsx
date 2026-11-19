import Link from "next/link";
import { ArrowLeft, ChevronDown, Clock, FileText, Save, SquarePen } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { orderService } from "@/services/order.service";
import { amendOrderFormAction } from "./actions";

const ST: Record<string, { label: string; pill: string; dot: string }> = {
  CONFIRMED: { label: "Confirmed", pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  IN_PRODUCTION: { label: "In Production", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  PARTIALLY_SHIPPED: { label: "Partially Shipped", pill: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  FULLY_SHIPPED: { label: "Fully Shipped", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  CLOSED: { label: "Closed", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const LABEL = "block text-sm font-semibold text-navy-800";
const INPUT =
  "mt-1.5 h-11 w-full rounded-lg border bg-slate-50 px-3.5 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:bg-card focus:ring-2 focus:ring-blue-200";

export default async function OrderAmendmentsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [allOrders, params] = await Promise.all([orderService.list(), searchParams]);
  const orders = allOrders.filter((o) => o.status !== "DRAFT" && o.status !== "CANCELLED");
  const details = await Promise.all(orders.map((o) => orderService.get(o.id)));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <SquarePen className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Order amendments</h1>
              <p className="text-sm text-navy-800">
                Change confirmed orders with a reason and immutable previous-value snapshots.
              </p>
            </div>
          </div>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold text-navy-800 shadow-card transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </header>
      </PageBand>

      {params.saved === "1" && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Amendment saved.
        </p>
      )}

      <p className="rounded-xl border bg-card px-4 py-3 text-sm text-slate-500 shadow-card">
        Only non-draft, non-cancelled orders can be amended. Fill at least one field to change. Every amendment
        requires a reason.
      </p>

      {details.map((order) => {
        if (!order) return null;
        const S = ST[order.status] ?? { label: order.status, pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
        const count = order.amendments.length;
        return (
          <section
            key={order.id}
            className="space-y-4 rounded-card border border-l-4 border-l-blue-600 bg-card p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="h-7 w-7" strokeWidth={2} />
                </span>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-navy-800">
                    {order.orderNo} - {order.buyer.name}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-800">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${S.pill}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${S.dot}`} />
                      {S.label}
                    </span>
                    <span>Buyer PO: {order.buyerPoNo || "-"}</span>
                    <span>Ship date: {order.shipDate?.toISOString().slice(0, 10) || "-"}</span>
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-navy-800">
                <Clock className="h-4 w-4 text-blue-600" />
                {count} amendment(s)
              </span>
            </div>

            <form action={amendOrderFormAction} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className={LABEL}>
                  Reason
                  <input
                    required
                    minLength={3}
                    name="reason"
                    className={INPUT}
                    placeholder="Buyer requested ship date change"
                  />
                </label>
                <label className={LABEL}>
                  New buyer PO number
                  <input name="buyerPoNo" className={INPUT} placeholder="Leave blank to keep unchanged" />
                </label>
                <label className={LABEL}>
                  New ship date
                  <input name="shipDate" type="date" className={INPUT} />
                </label>
                <label className={LABEL}>
                  New notes
                  <input name="notes" className={INPUT} placeholder="Optional updated notes" />
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy-800 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
              >
                <Save className="h-4 w-4" />
                Save amendment
              </button>
            </form>

            {count > 0 && (
              <details className="group border-t border-slate-100 pt-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-navy-800 [&::-webkit-details-marker]:hidden">
                  Amendment history
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <ol className="mt-3 space-y-2">
                  {order.amendments.map((a) => (
                    <li key={a.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="font-semibold text-navy-800">
                        Amendment #{a.amendmentNo} · {a.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </div>
                      <div className="text-slate-600">{a.reason}</div>
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-slate-500">
                        {JSON.stringify(a.previousValues, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        );
      })}

      {orders.length === 0 && (
        <div className="rounded-card border bg-card p-8 text-center text-sm text-slate-500 shadow-card">
          No amendable orders found. Confirm an order first.
        </div>
      )}
    </div>
  );
}