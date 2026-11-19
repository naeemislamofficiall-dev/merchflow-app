import Link from "next/link";
import { Box, Play } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { mrpService } from "@/services/mrp.service";
import { MrpTable, type MrpRow } from "./mrp-table";

export default async function MaterialRequirementsPage() {
  const runs = await mrpService.list();

  const rows: MrpRow[] = runs.map((r) => ({
    id: r.id,
    runDate: r.runDate.toISOString().slice(0, 10),
    styleNo: r.bom.style.styleNo,
    bom: `v${r.bom.version}`,
    order: r.order?.orderNo ?? "",
    orderQty: r.orderQty,
    lines: r._count.lines,
    pr: r.purchaseRequisitions.map((p) => p.prNo).join(", "),
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Box className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Material Requirements</h1>
              <p className="text-sm text-navy-800">
                MRP runs: how much material an order needs, and what is short
              </p>
            </div>
          </div>
          <Link
            href="/material-requirements/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Play className="h-4 w-4" fill="currentColor" /> Run MRP
          </Link>
        </header>
      </PageBand>

      <MrpTable rows={rows} />
    </div>
  );
}