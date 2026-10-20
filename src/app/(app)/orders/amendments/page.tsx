import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { amendOrderFormAction } from "./actions";

export default async function OrderAmendmentsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [allOrders, params] = await Promise.all([orderService.list(), searchParams]);
  const orders = allOrders.filter((o) => o.status !== "DRAFT" && o.status !== "CANCELLED");
  const details = await Promise.all(orders.map((o) => orderService.get(o.id)));
  return <div className="space-y-5">
    <PageHeader title="Order amendments" description="Change confirmed orders with a reason and immutable previous-value snapshots." actions={<Link className="rounded-md border px-3 py-2 text-sm" href="/orders">Back to orders</Link>} />
    {params.saved === "1" && <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">Amendment saved.</p>}
    <div className="rounded-lg border p-4 text-sm text-muted-foreground">Only non-draft, non-cancelled orders can be amended. Fill at least one field to change; every amendment requires a reason. Existing order service rules validate the transaction.</div>
    {details.map((order) => order && <section key={order.id} className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{order.orderNo} <span className="text-sm font-normal text-muted-foreground">· {order.buyer.name}</span></h2><p className="text-sm text-muted-foreground">Status: {order.status} · Buyer PO: {order.buyerPoNo || "—"} · Ship date: {order.shipDate?.toISOString().slice(0,10) || "—"}</p></div><span className="text-sm">{order.amendments.length} amendment(s)</span></div>
      <form action={amendOrderFormAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="orderId" value={order.id} />
        <label className="grid gap-1 text-sm">Reason <input required minLength={3} name="reason" className="rounded-md border bg-background px-3 py-2" placeholder="Buyer requested ship date change" /></label>
        <label className="grid gap-1 text-sm">New buyer PO number <input name="buyerPoNo" className="rounded-md border bg-background px-3 py-2" placeholder="Leave blank to keep unchanged" /></label>
        <label className="grid gap-1 text-sm">New ship date <input name="shipDate" type="date" className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">New notes <input name="notes" className="rounded-md border bg-background px-3 py-2" placeholder="Optional updated notes" /></label>
        <div className="md:col-span-2"><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">Save amendment</button></div>
      </form>
      {order.amendments.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Amendment history</summary><ol className="mt-2 space-y-2">{order.amendments.map((a) => <li key={a.id} className="rounded-md bg-muted/40 p-3"><div className="font-medium">Amendment #{a.amendmentNo} · {a.createdAt.toISOString().slice(0,16).replace("T"," ")}</div><div className="text-muted-foreground">{a.reason}</div><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(a.previousValues, null, 2)}</pre></li>)}</ol></details>}
    </section>)}
    {orders.length === 0 && <div className="rounded-lg border p-6 text-sm text-muted-foreground">No amendable orders found. Confirm an order first.</div>}
  </div>;
}
