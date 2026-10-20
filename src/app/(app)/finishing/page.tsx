import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { finishingService } from "@/services/finishing.service";
import { productionOrderService } from "@/services/production-order.service";
import { FinishingForm } from "./finishing-form";

export default async function FinishingPage(props: { searchParams: Promise<{ productionOrderId?: string }> }) {
  const sp = await props.searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const all = await productionOrderService.list().catch(() => []);
  const running = all.filter((p) => p.status === "IN_PROGRESS");
  const selected = running.find((p) => p.id === sp.productionOrderId);

  const data = selected ? await finishingService.forProductionOrder(selected.id).catch(() => null) : null;

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader title="Finishing" description="Thread cutting, ironing, folding, metal check and final QC after sewing" />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="productionOrderId" className="mb-1 block text-sm font-medium">
            Production order
          </label>
          <select
            id="productionOrderId"
            name="productionOrderId"
            defaultValue={selected?.id ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select...</option>
            {running.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productionNo} ({p.style.styleNo})
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Show</Button>
      </form>

      {running.length === 0 && (
        <p className="text-sm text-muted-foreground">No production order is running. Start one first.</p>
      )}
      {running.length > 0 && !selected && (
        <p className="text-sm text-muted-foreground">Pick a production order to see and record finishing.</p>
      )}

      {selected && data && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Sewing output</p>
                <p className="text-2xl font-semibold">{data.sewingOutput}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Received in finishing</p>
                <p className="text-2xl font-semibold">{data.totals.input}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Still waiting for finishing</p>
                <p className="text-2xl font-semibold">{data.waitingForFinishing}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Finished</p>
                <p className="text-2xl font-semibold">{data.totals.output}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {selected.productionNo}: daily log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Thread cut</TableHead>
                    <TableHead className="text-right">Ironed</TableHead>
                    <TableHead className="text-right">Folded</TableHead>
                    <TableHead className="text-right">Metal</TableHead>
                    <TableHead className="text-right">QC passed</TableHead>
                    <TableHead className="text-right">Rework</TableHead>
                    <TableHead className="text-right">Finished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={9} className="h-16 text-center text-muted-foreground">
                        Nothing recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.logDate.toISOString().slice(0, 10)}</TableCell>
                        <TableCell className="text-right">{l.inputQty}</TableCell>
                        <TableCell className="text-right">{l.threadCutQty}</TableCell>
                        <TableCell className="text-right">{l.ironedQty}</TableCell>
                        <TableCell className="text-right">{l.foldedQty}</TableCell>
                        <TableCell className="text-right">{l.metalCheckedQty}</TableCell>
                        <TableCell className="text-right">{l.qcPassedQty}</TableCell>
                        <TableCell className="text-right">{l.reworkQty}</TableCell>
                        <TableCell className="text-right">{l.outputQty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {data.logs.length > 0 && (
                  <TableBody>
                    <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{data.totals.input}</TableCell>
                      <TableCell className="text-right">{data.totals.threadCut}</TableCell>
                      <TableCell className="text-right">{data.totals.ironed}</TableCell>
                      <TableCell className="text-right">{data.totals.folded}</TableCell>
                      <TableCell className="text-right">{data.totals.metalChecked}</TableCell>
                      <TableCell className="text-right">{data.totals.qcPassed}</TableCell>
                      <TableCell className="text-right">{data.totals.rework}</TableCell>
                      <TableCell className="text-right">{data.totals.output}</TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </CardContent>
          </Card>

          <FinishingForm key={selected.id} productionOrderId={selected.id} date={today} />
        </>
      )}
    </div>
  );
}