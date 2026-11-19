import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { bomService } from "@/services/bom.service";
import { BomsTable, type BomRow } from "./boms-table";

export default async function BomPage() {
  const boms = await bomService.list();

  const rows: BomRow[] = boms.map((b) => ({
    id: b.id,
    styleNo: b.style.styleNo,
    styleName: b.style.name,
    version: `v${b.version}`,
    items: b._count.items,
    status: b.status,
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
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Bills of Material</h1>
              <p className="text-sm text-navy-800">Material list of every style, with versions</p>
            </div>
          </div>
          <Link
            href="/bom/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New BOM
          </Link>
        </header>
      </PageBand>

      <BomsTable rows={rows} />
    </div>
  );
}