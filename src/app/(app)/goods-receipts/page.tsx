import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="space-y-4">
      <PageHeader
        title="Goods receipts"
        description="Material received against purchase orders. Posting a GRN adds it to stock"
        actions={
          <Link href="/goods-receipts/new" className={buttonVariants()}>
            New GRN
          </Link>
        }
      />
      <GrnsTable rows={rows} />
    </div>
  );
}