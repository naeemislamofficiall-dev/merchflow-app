import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { qualityService } from "@/services/quality.service";
import { InspectionsTable, type InspectionRow } from "./inspections-table";

const STAGES = ["INCOMING", "FABRIC", "CUTTING", "INLINE", "ENDLINE", "FINISHING"] as const;
type Stage = (typeof STAGES)[number];

export default async function InspectionsPage(props: { searchParams: Promise<{ stage?: string }> }) {
  const sp = await props.searchParams;
  const stage = STAGES.find((s) => s === sp.stage) as Stage | undefined;

  const [summary, list] = await Promise.all([
    qualityService.summary(stage ? { stage } : {}),
    qualityService.list(stage ? { stage } : {}),
  ]);

  const rows: InspectionRow[] = list.map((i) => {
    const defects = i.occurrences.reduce((s, o) => s + o.quantity, 0);
    return {
      id: i.id,
      inspectionNo: i.inspectionNo,
      stage: i.stage.toLowerCase(),
      operation: i.operation ?? "",
      sampleSize: i.sampleSize,
      defectiveQty: i.defectiveQty,
      defects,
      dhu: i.sampleSize > 0 ? `${((defects / i.sampleSize) * 100).toFixed(1)}%` : "-",
      inspectedAt: i.inspectedAt.toISOString().slice(0, 16).replace("T", " "),
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inspections"
        description="Quality checks at every stage. DHU = defects per 100 pieces checked"
        actions={
          <Link href="/quality/inspections/new" className={buttonVariants()}>
            New inspection
          </Link>
        }
      />

      <form method="get" className="flex items-end gap-3">
        <div>
          <label htmlFor="stage" className="mb-1 block text-sm font-medium">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={stage ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inspections</p>
            <p className="text-2xl font-semibold">{summary.inspections}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pieces checked</p>
            <p className="text-2xl font-semibold">{summary.checked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Defects found</p>
            <p className="text-2xl font-semibold">{summary.defects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">DHU</p>
            <p className="text-2xl font-semibold">{summary.dhu === null ? "-" : `${summary.dhu}%`}</p>
          </CardContent>
        </Card>
      </div>

      {summary.pareto.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Defect Pareto</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Defect</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.pareto.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.count}</TableCell>
                    <TableCell className="text-right">{p.pct}%</TableCell>
                    <TableCell className="text-right">{p.cumulativePct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InspectionsTable rows={rows} />
    </div>
  );
}