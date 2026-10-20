import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { cuttingService } from "@/services/cutting.service";
import { CuttingTable, type CutPlanRow } from "./cutting-table";

export default async function CuttingPage() {
  const plans = await cuttingService.plans();

  const rows: CutPlanRow[] = plans.map((p) => ({
    id: p.id,
    cutPlanNo: p.cutPlanNo,
    productionNo: p.productionOrder.productionNo,
    color: p.color,
    plannedPlies: p.plannedPlies,
    plannedOutput: p.plannedOutput,
    lays: `${p.lays.filter((l) => l.status === "CUT").length} / ${p.lays.length}`,
    status: p.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cutting"
        description="Cut plans, lays and bundles for released production orders"
        actions={
          <Link href="/cutting/new" className={buttonVariants()}>
            New cut plan
          </Link>
        }
      />
      <CuttingTable rows={rows} />
    </div>
  );
}