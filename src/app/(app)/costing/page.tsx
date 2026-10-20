import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { costingService } from "@/services/costing.service";
import { CostingTable, type SheetRow } from "./costing-table";

const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export default async function CostingPage() {
  const sheets = await costingService.list();

  const rows: SheetRow[] = sheets.map((s) => ({
    id: s.id,
    style: `${s.style.styleNo} - ${s.style.name}`,
    version: `v${s.version}`,
    type: s.costType === "POST" ? "Post costing" : "Estimate",
    currency: s.currency,
    totalCost: money(Number(s.totalCost)),
    margin: `${Number(s.marginPct)}%`,
    quotedPrice: money(Number(s.quotedPrice)),
    status: s.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Costing"
        description="Cost sheets by style. An approved sheet is locked, changes need a new version."
        actions={
          <Link href="/costing/new" className={buttonVariants()}>
            New cost sheet
          </Link>
        }
      />
      <CostingTable rows={rows} />
    </div>
  );
}