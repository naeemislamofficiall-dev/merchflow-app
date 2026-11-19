import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { rfqService } from "@/services/rfq.service";
import { RfqsTable, type RfqRow } from "./rfqs-table";

export default async function RfqsPage() {
  const list = await rfqService.list();

  const rows: RfqRow[] = list.map((r) => ({
    id: r.id,
    rfqNo: r.rfqNo,
    due: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : "",
    lines: r._count.lines,
    suppliers: r._count.suppliers,
    quotations: r._count.quotations,
    status: r.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <ListChecks className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">RFQs</h1>
              <p className="text-sm text-navy-800">
                Ask suppliers for prices on the material of an approved purchase requisition
              </p>
            </div>
          </div>
          <Link
            href="/rfqs/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New RFQ
          </Link>
        </header>
      </PageBand>

      <RfqsTable rows={rows} canCreate />
    </div>
  );
}