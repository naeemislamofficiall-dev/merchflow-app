import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="space-y-4">
      <PageHeader
        title="Material requirements"
        description="MRP runs: how much material an order needs, and what is short"
        actions={
          <Link href="/material-requirements/new" className={buttonVariants()}>
            Run MRP
          </Link>
        }
      />
      <MrpTable rows={rows} />
    </div>
  );
}