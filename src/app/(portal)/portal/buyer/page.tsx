import { portalBuyerService } from "@/services/portal-buyer.service";
import { decideSampleAction } from "./actions";

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");
const box = "overflow-x-auto rounded border bg-white";
const head = "bg-gray-100 text-left";

export default async function BuyerPortalHome({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const [styles, orders, samples, tna, shipments] = await Promise.all([
    portalBuyerService.listStyles(),
    portalBuyerService.listOrders(),
    portalBuyerService.listSamples(),
    portalBuyerService.listTna(),
    portalBuyerService.listShipments(),
  ]);

  return (
    <div className="space-y-8">
      {sp.ok && <p className="rounded bg-green-100 p-2 text-green-800">{sp.ok}</p>}
      {sp.err && <p className="rounded bg-red-100 p-2 text-red-800">{sp.err}</p>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Samples</h2>
        <div className="space-y-3">
          {samples.length === 0 && <p className="text-sm text-gray-500">No samples</p>}
          {samples.map((s) => (
            <div key={s.id} className="rounded border bg-white p-4 text-sm">
              <div className="font-semibold">{s.sampleNo} - {s.style.styleNo} ({s.sampleType}) - {s.status}</div>
              <div>Qty {s.quantity}, due {fmt(s.dueDate)}, sent {fmt(s.sentDate)}, tracking {s.trackingNo ?? "-"}</div>
              {s.approvals.length > 0 && (
                <ul className="mt-1 text-gray-600">
                  {s.approvals.map((a) => (
                    <li key={a.round}>Round {a.round}: {a.decision} {a.comments ? `- ${a.comments}` : ""}</li>
                  ))}
                </ul>
              )}
              {s.status === "BUYER_REVIEW" && (
                <form action={decideSampleAction} className="mt-3 space-y-2">
                  <input type="hidden" name="sampleId" value={s.id} />
                  <textarea name="comments" placeholder="Comments (required when rejecting)" className="w-full rounded border px-2 py-1" rows={2} />
                  <div className="flex gap-2">
                    <button type="submit" name="decision" value="APPROVED" className="rounded bg-green-600 px-3 py-1 text-white">Approve</button>
                    <button type="submit" name="decision" value="REJECTED" className="rounded bg-red-600 px-3 py-1 text-white">Reject</button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Orders</h2>
        <div className={box}>
          <table className="w-full text-sm">
            <thead className={head}>
              <tr><th className="p-2">Order</th><th className="p-2">Buyer PO</th><th className="p-2">Status</th><th className="p-2">Ship date</th><th className="p-2">Qty</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={5}>No orders</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">{o.orderNo}</td>
                  <td className="p-2">{o.buyerPoNo ?? "-"}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2">{fmt(o.shipDate)}</td>
                  <td className="p-2">{o.lines.reduce((x, l) => x + l.quantity, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Time and action (T&amp;A)</h2>
        <div className="space-y-3">
          {tna.length === 0 && <p className="text-sm text-gray-500">No T&amp;A plans</p>}
          {tna.map((p) => (
            <div key={p.id} className={box}>
              <div className="bg-gray-50 p-2 text-sm font-semibold">{p.order?.orderNo ?? "-"} / {p.style.styleNo} - ship {fmt(p.shipDate)}</div>
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr><th className="p-2">Task</th><th className="p-2">Planned</th><th className="p-2">Revised</th><th className="p-2">Actual</th><th className="p-2">Status</th></tr>
                </thead>
                <tbody>
                  {p.tasks.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">{t.name}</td>
                      <td className="p-2">{fmt(t.plannedDate)}</td>
                      <td className="p-2">{fmt(t.revisedDate)}</td>
                      <td className="p-2">{fmt(t.actualDate)}</td>
                      <td className="p-2">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Shipments</h2>
        <div className={box}>
          <table className="w-full text-sm">
            <thead className={head}>
              <tr><th className="p-2">Shipment</th><th className="p-2">Status</th><th className="p-2">Mode</th><th className="p-2">Planned</th><th className="p-2">Shipped</th><th className="p-2">Destination</th></tr>
            </thead>
            <tbody>
              {shipments.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={6}>No shipments</td></tr>}
              {shipments.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.shipmentNo}</td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2">{s.mode}</td>
                  <td className="p-2">{fmt(s.plannedShipDate)}</td>
                  <td className="p-2">{fmt(s.actualShipDate)}</td>
                  <td className="p-2">{s.destination ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Styles</h2>
        <div className={box}>
          <table className="w-full text-sm">
            <thead className={head}>
              <tr><th className="p-2">Style</th><th className="p-2">Name</th><th className="p-2">Season</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {styles.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={4}>No styles</td></tr>}
              {styles.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.styleNo}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{s.season ?? "-"}</td>
                  <td className="p-2">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}