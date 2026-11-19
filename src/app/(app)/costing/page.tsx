import Link from "next/link";
import { Calculator, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { costingService } from "@/services/costing.service";
import { CostingTable, type SheetRow } from "./costing-table";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default async function CostingPage() {
  const sheets = await costingService.list();

  const rows: SheetRow[] = sheets.map((s) => ({
    id: s.id,
    styleNo: s.style.styleNo,
    styleName: s.style.name,
    version: `v${s.version}`,
    type: s.costType === "POST" ? "Post costing" : "Estimate",
    currency: s.currency,
    totalCost: money(Number(s.totalCost)),
    margin: `${Number(s.marginPct)}%`,
    quotedPrice: money(Number(s.quotedPrice)),
    status: s.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Calculator className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Costing</h1>
              <p className="text-sm text-navy-800">
                Cost sheets by style. An approved sheet is locked, changes need a new version.
              </p>
            </div>
          </div>
          <Link
            href="/costing/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Cost Sheet
          </Link>
        </header>
      </PageBand>

      <CostingTable rows={rows} />
    </div>
  );
}