import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { prService } from "@/services/pr.service";
import { PrsTable, type PrRow } from "./prs-table";
import { ReorderButton } from "./reorder-button";

export default async function PrsPage() {
  const prs = await prService.list();

  const rows: PrRow[] = prs.map((p) => ({
    id: p.id,
    prNo: p.prNo,
    source: p.source,
    priority: p.priority,
    lines: p.lines.length,
    requiredDate: p.requiredDate ? p.requiredDate.toISOString().slice(0, 10) : "",
    createdAt: p.createdAt.toISOString().slice(0, 10),
    status: p.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase requisitions"
        description="Requests to buy material, from MRP, reorder points or manual entry"
        actions={
          <>
            <ReorderButton />
            <Link href="/prs/new" className={buttonVariants()}>
              New PR
            </Link>
          </>
        }
      />
      <PrsTable rows={rows} />
    </div>
  );
}