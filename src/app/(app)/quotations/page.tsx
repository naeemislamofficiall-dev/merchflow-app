import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { materialService } from "@/services/material.service";
import { quotationService } from "@/services/quotation.service";
import { rfqService } from "@/services/rfq.service";
import { QuotationBoard, type QuotationItem } from "./quotation-board";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const price = (v: unknown) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(v));

const LABEL = "mb-1.5 block text-sm font-semibold text-navy-800";
const SELECT =
  "h-11 w-full rounded-lg border bg-card px-3.5 text-sm font-medium text-navy-800 outline-none focus:ring-2 focus:ring-blue-200";

export default async function QuotationsPage(props: {
  searchParams: Promise<{ materialId?: string; rfqId?: string }>;
}) {
  const sp = await props.searchParams;
  const [materials, rfqs] = await Promise.all([
    materialService.list({ activeOnly: true }).catch(() => []),
    rfqService.list().catch(() => []),
  ]);
  const materialName = new Map(materials.map((m) => [m.id, m.name]));

  // mal bacha thakle score soho tulona, na thakle shadharon talika
  let rows: QuotationItem[];
  const scored = !!sp.materialId;
  if (sp.materialId) {
    const list = await quotationService.compare({ materialId: sp.materialId, ...(sp.rfqId ? { rfqId: sp.rfqId } : {}) });
    rows = [...list]
      .sort((a, b) => Number(b.score) - Number(a.score))
      .map((q) => ({
        id: q.id,
        quotationNo: q.quotationNo,
        revisionNo: q.revisionNo,
        supplier: q.supplier.name,
        material: materialName.get(q.materialId) ?? "-",
        unitPrice: price(q.unitPrice),
        currency: q.currency,
        leadTimeDays: q.leadTimeDays,
        qualityRating: q.qualityRating,
        score: num(q.score),
        status: q.status,
      }));
  } else {
    const list = await quotationService.list(sp.rfqId ? { rfqId: sp.rfqId } : {});
    rows = list.map((q) => ({
      id: q.id,
      quotationNo: q.quotationNo,
      revisionNo: q.revisionNo,
      supplier: q.supplier.name,
      material: q.material.name,
      unitPrice: price(q.unitPrice),
      currency: q.currency,
      leadTimeDays: q.leadTimeDays,
      qualityRating: q.qualityRating,
      score: num(q.score),
      status: q.status,
    }));
  }

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <FileText className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Quotations</h1>
              <p className="text-sm text-navy-800">
                Prices received from suppliers. Pick a material to compare them with a score.
              </p>
            </div>
          </div>
          <Link
            href="/quotations/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            Record Quotation <Plus className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </header>
      </PageBand>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border bg-card p-5 shadow-card"
      >
        <div className="w-full sm:w-72">
          <label htmlFor="materialId" className={LABEL}>
            Material (compare)
          </label>
          <select id="materialId" name="materialId" defaultValue={sp.materialId ?? ""} className={SELECT}>
            <option value="">All materials</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-52">
          <label htmlFor="rfqId" className={LABEL}>
            RFQ
          </label>
          <select id="rfqId" name="rfqId" defaultValue={sp.rfqId ?? ""} className={SELECT}>
            <option value="">All RFQs</option>
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rfqNo}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-lg bg-navy-800 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          Show
        </button>
      </form>

      <QuotationBoard rows={rows} scored={scored} />
    </div>
  );
}