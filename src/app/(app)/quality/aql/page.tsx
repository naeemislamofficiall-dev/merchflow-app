import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { aqlService } from "@/services/aql.service";
import { AqlTable, type AqlRow } from "./aql-table";

export default async function AqlPage() {
  const [list, rate] = await Promise.all([aqlService.list(), aqlService.passRate()]);

  const rows: AqlRow[] = list.map((a) => ({
    id: a.id,
    inspectionNo: a.inspectionNo,
    stage: a.stage.toLowerCase(),
    lotSize: a.lotSize,
    sampleSize: a.sampleSize,
    found:
      a.foundMajor === null
        ? "-"
        : `${a.foundCritical ?? 0} / ${a.foundMajor} / ${a.foundMinor ?? 0}`,
    result: a.result,
    createdAt: a.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="AQL inspections"
        description="Final and pre-shipment inspection. A failed final inspection blocks the shipment"
        actions={
          <Link href="/quality/aql/new" className={buttonVariants()}>
            New AQL inspection
          </Link>
        }
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold">{rate.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="text-2xl font-semibold">{rate.passed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pass rate</p>
            <p className="text-2xl font-semibold">{rate.passRatePct === null ? "-" : `${rate.passRatePct}%`}</p>
          </CardContent>
        </Card>
      </div>
      <AqlTable rows={rows} />
    </div>
  );
}