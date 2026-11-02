import Link from "next/link";
import { portalSupplierService } from "@/services/portal-supplier.service";
import { quotationAction } from "../../actions";

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");
const input = "w-full rounded border px-2 py-1";

export default async function SupplierRfqPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const rfq = await portalSupplierService.getRfq(id);

  return (
    <div className="space-y-6">
      <Link href="/portal/supplier" className="text-sm text-blue-600 underline">&larr; Back</Link>
      <h1 className="text-xl font-semibold">RFQ {rfq.rfqNo}</h1>
      <p className="text-sm">Due date: <b>{fmt(rfq.dueDate)}</b></p>
      {sp.ok && <p className="rounded bg-green-100 p-2 text-green-800">{sp.ok}</p>}
      {sp.err && <p className="rounded bg-red-100 p-2 text-red-800">{sp.err}</p>}

      {rfq.lines.map((l) => (
        <form key={l.id} action={quotationAction} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-semibold">{l.material.name} ({Number(l.quantity)} {l.unit}, needed by {fmt(l.requiredDate)})</h2>
          <input type="hidden" name="rfqId" value={rfq.id} />
          <input type="hidden" name="materialId" value={l.materialId} />
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="unitPrice" type="number" step="0.0001" min="0" placeholder="Unit price" required className={input} />
            <input name="currency" maxLength={3} placeholder="Currency (e.g. USD)" className={input} />
            <input name="leadTimeDays" type="number" min="1" placeholder="Lead time (days)" className={input} />
          </div>
          <label className="block text-sm">Valid until<input type="date" name="validUntil" className={input} /></label>
          <input name="notes" placeholder="Notes (optional)" className={input} />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">Submit quotation</button>
        </form>
      ))}

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">My submitted quotations</h2>
        {rfq.quotations.length === 0 && <p className="text-sm text-gray-500">None yet</p>}
        <ul className="space-y-1 text-sm">
          {rfq.quotations.map((q) => (
            <li key={q.id}>{q.quotationNo} rev {q.revisionNo}: {Number(q.unitPrice)} {q.currency}, lead {q.leadTimeDays ?? "-"} days, {q.status}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}