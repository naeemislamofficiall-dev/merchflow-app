import Link from "next/link";
import { portalSupplierService } from "@/services/portal-supplier.service";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function SupplierPortalHome() {
  const [pos, rfqs, invoices] = await Promise.all([
    portalSupplierService.listPos(),
    portalSupplierService.listRfqs(),
    portalSupplierExtraService.listInvoices(),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Open RFQs</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr><th className="p-2">RFQ</th><th className="p-2">Due date</th><th className="p-2">Lines</th><th className="p-2">My quotes</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {rfqs.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={5}>No open RFQs</td></tr>}
              {rfqs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.rfqNo}</td>
                  <td className="p-2">{fmt(r.dueDate)}</td>
                  <td className="p-2">{r.lines.length}</td>
                  <td className="p-2">{r.quotations.length}</td>
                  <td className="p-2"><Link className="text-blue-600 underline" href={`/portal/supplier/rfqs/${r.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Purchase orders</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr><th className="p-2">PO</th><th className="p-2">Status</th><th className="p-2">Required date</th><th className="p-2">Confirmed date</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {pos.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={5}>No purchase orders</td></tr>}
              {pos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.poNo}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2">{fmt(p.deliveryDate)}</td>
                  <td className="p-2">{fmt(p.followUps[0]?.latestPromisedDate)}</td>
                  <td className="p-2"><Link className="text-blue-600 underline" href={`/portal/supplier/pos/${p.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Invoices (proforma)</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr><th className="p-2">PI no</th><th className="p-2">Date</th><th className="p-2">PO</th><th className="p-2">Amount</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={4}>No invoices</td></tr>}
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2">{i.piNo}</td>
                  <td className="p-2">{fmt(i.piDate)}</td>
                  <td className="p-2">{i.po?.poNo ?? "-"}</td>
                  <td className="p-2">{Number(i.amount).toFixed(2)} {i.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}