import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { grnService } from "@/services/grn.service";
import { GrnsTable, type GrnRow } from "./grns-table";

export default async function GoodsReceiptsPage() {
  const grns = await grnService.list();

  const rows: GrnRow[] = grns.map((g) => ({
    id: g.id,
    grnNo: g.grnNo,
    poNo: g.po.poNo,
    warehouse: g.warehouse.code,
    receivedDate: g.receivedDate.toISOString().slice(0, 10),
    challanNo: g.challanNo ?? "",
    status: g.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Box className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Goods receipts</h1>
              <p className="text-sm text-slate-500">
                Material received against purchase orders. Posting a GRN adds it to stock
              </p>
            </div>
          </div>
          <Link
            href="/goods-receipts/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New GRN
          </Link>
        </header>
      </PageBand>

      <GrnsTable rows={rows} />
    </div>
  );
}