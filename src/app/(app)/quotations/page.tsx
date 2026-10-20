import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { materialService } from "@/services/material.service";
import { quotationService } from "@/services/quotation.service";
import { rfqService } from "@/services/rfq.service";
import { QuotationBoard, type QuotationItem } from "./quotation-board";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const price = (v: unknown) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(v));

export default async function QuotationsPage(props: {
  searchParams: Promise<{ materialId?: string; rfqId?: string }>;
}) {
  const sp = await props.searchParams;
  const [materials, rfqs] = await Promise.all([
    materialService.list({ activeOnly: true }).catch(() => []),
    rfqService.list().catch(() => []),
  ]);
  const materialName = new Map(materials.map((m) => [m.id, m.name]));

  // মাল বাছা থাকলে স্কোর সহ তুলনা, না থাকলে সাধারণ তালিকা
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
    <div className="space-y-4">
      <PageHeader
        title="Quotations"
        description="Prices received from suppliers. Pick a material to compare them with a score"
        actions={
          <Link href="/quotations/new" className={buttonVariants()}>
            Record quotation
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="materialId" className="mb-1 block text-sm font-medium">
            Material (compare)
          </label>
          <select
            id="materialId"
            name="materialId"
            defaultValue={sp.materialId ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All materials</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rfqId" className="mb-1 block text-sm font-medium">
            RFQ
          </label>
          <select
            id="rfqId"
            name="rfqId"
            defaultValue={sp.rfqId ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All RFQs</option>
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rfqNo}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Show</Button>
      </form>

      <QuotationBoard rows={rows} scored={scored} />
    </div>
  );
}