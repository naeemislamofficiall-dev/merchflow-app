import { Search } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/detail/status-badge";
import { fabricInspectionService } from "@/services/fabric-inspection.service";
import { inventoryService } from "@/services/inventory.service";
import { InspectionForm } from "./inspection-form";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const when = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

// SHUDHU SAJANO: kapoder roll-er icon. Kono data nei.
function RollArt() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
      <g transform="rotate(-30 20 20)">
        <rect x="6" y="12" width="26" height="16" rx="8" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2.5" />
        <circle cx="14" cy="20" r="8" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
        <circle cx="14" cy="20" r="3" fill="#2563eb" />
      </g>
    </svg>
  );
}
export default async function FabricRollsPage(props: { searchParams: Promise<{ rollNo?: string }> }) {
  const { rollNo } = await props.searchParams;
  const query = rollNo?.trim() ?? "";
  const result = query ? await inventoryService.scanRoll(query).catch(() => null) : null;
  const inspections = result
    ? await fabricInspectionService.listForRoll(result.roll.rollNo).catch(() => [])
    : [];

  return (
        <div className="stagger space-y-4">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-card">
            <RollArt />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Fabric rolls</h1>
            <p className="text-sm text-slate-500">Scan or type a roll number to see its full history</p>
          </div>
        </header>
      </PageBand>

      <form
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-card border border-slate-100 bg-white p-4 shadow-card"
      >
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            name="rollNo"
            defaultValue={query}
            placeholder="Roll no"
            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} /> Find
        </button>
      </form>

      {query && !result && <p className="text-sm text-destructive">No roll found with number {query}.</p>}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {result.roll.rollNo}
                <StatusBadge status={result.roll.inspectionStatus} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Material</p>
                <p className="font-medium">{result.roll.material.name}</p>
                <p className="text-xs text-muted-foreground">{result.roll.material.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lot / shade</p>
                <p className="font-medium">
                  {result.roll.lot.lotNo} / {result.roll.shade ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {result.roll.warehouse.code}
                  {result.roll.bin ? ` / ${result.roll.bin.code}` : ""}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">GRN</p>
                <p className="font-medium">{result.roll.grnLine?.grn.grnNo ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">On hand</p>
                <p className="font-medium">{fmt(result.onHand)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Issued</p>
                <p className="font-medium">{fmt(result.issued)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reserved</p>
                <p className="font-medium">{fmt(result.reserved)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-medium">{fmt(result.available)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Shade</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                        Not inspected yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspections.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{when(i.inspectedAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={i.result} />
                        </TableCell>
                        <TableCell>{i.method ?? "-"}</TableCell>
                        <TableCell className="text-right">{i.defectPoints}</TableCell>
                        <TableCell>{i.shade ?? "-"}</TableCell>
                        <TableCell>{i.remarks ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <InspectionForm rollNo={result.roll.rollNo} />

          <Card>
            <CardHeader>
              <CardTitle>Stock history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.history.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{when(t.createdAt)}</TableCell>
                      <TableCell>{t.type.replace(/_/g, " ").toLowerCase()}</TableCell>
                      <TableCell className="text-right">{fmt(Number(t.quantity))}</TableCell>
                      <TableCell>{t.remarks ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}