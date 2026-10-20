import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { tnaService } from "@/services/tna.service";
import { TnaTable, type PlanRow } from "./tna-table";

export default async function TnaPage() {
  const plans = await tnaService.listPlans();

  const rows: PlanRow[] = plans.map((p) => {
    const total = p.tasks.length;
    const closed = p.tasks.filter((t) => t.status === "COMPLETED" || t.status === "WAIVED").length;
    const delayed = p.tasks.filter((t) => t.status === "DELAYED").length;
    const atRisk = p.tasks.some((t) => t.status === "AT_RISK");
    const status =
      delayed > 0 ? "DELAYED" : atRisk ? "AT_RISK" : total > 0 && closed === total ? "COMPLETED" : "ON_TRACK";
    return {
      id: p.id,
      style: p.style.styleNo,
      shipDate: p.shipDate.toISOString().slice(0, 10),
      progress: `${closed} / ${total}`,
      delayed,
      status,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Time & Action"
        description="Milestone plans counted backwards from the ship date"
        actions={
          <div className="flex gap-2">
            <Link href="/tna/templates" className={buttonVariants({ variant: "outline" })}>
              Templates
            </Link>
            <Link href="/tna/new" className={buttonVariants()}>
              Generate plan
            </Link>
          </div>
        }
      />
      <TnaTable rows={rows} />
    </div>
  );
}