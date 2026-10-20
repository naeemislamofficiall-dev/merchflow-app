import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="space-y-4">
      <PageHeader
        title="Bills of material"
        description="Material list of every style, with versions"
        actions={
          <Link href="/bom/new" className={buttonVariants()}>
            New BOM
          </Link>
        }
      />
      <BomsTable rows={rows} />
    </div>
  );
}