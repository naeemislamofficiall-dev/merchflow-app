import Link from "next/link";
import { portalSupplierService } from "@/services/portal-supplier.service";
import { portalSupplierExtraService } from "@/services/portal-supplier-extra.service";
import { confirmDateAction, documentAction, shipmentUpdateAction } from "../../actions";

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");
const OPEN = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"];
const input = "w-full rounded border px-2 py-1";

export default async function SupplierPoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const po = await portalSupplierService.getPo(id);
  const [updates, docs] = await Promise.all([
    portalSupplierExtraService.listShipmentUpdates(id),
    portalSupplierExtraService.listDocuments(id),
  ]);
  const follow = po.followUps[0];
  const open = OPEN.includes(po.status);

  return (
    <div className="space-y-6">
      <Link href="/portal/supplier" className="text-sm text-blue-600 underline">&larr; Back</Link>
      <h1 className="text-xl font-semibold">PO {po.poNo}</h1>
      {sp.ok && <p className="rounded bg-green-100 p-2 text-green-800">{sp.ok}</p>}
      {sp.err && <p className="rounded bg-red-100 p-2 text-red-800">{sp.err}</p>}

      <div className="grid gap-2 rounded border bg-white p-4 text-sm sm:grid-cols-2">
        <div>Status: <b>{po.status}</b></div>
        <div>Currency: {po.currency}</div>
        <div>Required date: <b>{fmt(po.deliveryDate)}</b></div>
        <div>Confirmed date: <b>{fmt(follow?.latestPromisedDate)}</b></div>
        <div>Payment terms: {po.paymentTerms ?? "-"}</div>
        <div>Destination: {po.destination ?? "-"}</div>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">Material</th><th className="p-2">Qty</th><th className="p-2">Received</th><th className="p-2">Rate</th><th className="p-2">Delivery</th></tr>
          </thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.material.name}</td>
                <td className="p-2">{Number(l.quantity)} {l.unit}</td>
                <td className="p-2">{Number(l.receivedQty)}</td>
                <td className="p-2">{Number(l.rate)}</td>
                <td className="p-2">{fmt(l.deliveryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <>
          <form action={confirmDateAction} className="space-y-2 rounded border bg-white p-4">
            <h2 className="font-semibold">Confirm delivery date</h2>
            <input type="hidden" name="poId" value={po.id} />
            <input type="date" name="confirmedDate" required className={input} />
            <input name="remarks" placeholder="Remarks (optional)" className={input} />
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">Confirm date</button>
          </form>

          <form action={shipmentUpdateAction} className="space-y-2 rounded border bg-white p-4">
            <h2 className="font-semibold">Shipment update</h2>
            <input type="hidden" name="poId" value={po.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">Shipped date<input type="date" name="shippedDate" className={input} /></label>
              <label className="text-sm">ETA<input type="date" name="etaDate" className={input} /></label>
              <input name="carrier" placeholder="Carrier" className={input} />
              <input name="trackingNo" placeholder="Tracking no" className={input} />
            </div>
            <input name="note" placeholder="Note (optional)" className={input} />
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">Save update</button>
          </form>
        </>
      )}

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Shipment updates</h2>
        {updates.length === 0 && <p className="text-sm text-gray-500">None yet</p>}
        <ul className="space-y-1 text-sm">
          {updates.map((u) => (
            <li key={u.id}>
              {fmt(u.createdAt)}: shipped {fmt(u.shippedDate)}, ETA {fmt(u.etaDate)}, {u.carrier ?? "-"} {u.trackingNo ?? ""} {u.note ?? ""}
            </li>
          ))}
        </ul>
      </div>

      <form action={documentAction} className="space-y-2 rounded border bg-white p-4">
        <h2 className="font-semibold">Add document link</h2>
        <input type="hidden" name="poId" value={po.id} />
        <select name="docType" className={input} defaultValue="PACKING_LIST">
          <option value="PACKING_LIST">Packing list</option>
          <option value="COMMERCIAL_INVOICE">Commercial invoice</option>
          <option value="TEST_REPORT">Test report</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="OTHER">Other</option>
        </select>
        <input name="fileName" placeholder="File name" required className={input} />
        <input name="url" placeholder="https://..." required className={input} />
        <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">Add link</button>
      </form>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">My documents</h2>
        {docs.length === 0 && <p className="text-sm text-gray-500">None yet</p>}
        <ul className="space-y-1 text-sm">
          {docs.map((d) => (
            <li key={d.id}>{d.docType}: <a className="text-blue-600 underline" href={d.storageUrl ?? "#"} target="_blank" rel="noreferrer">{d.fileName}</a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}