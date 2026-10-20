import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sewingService } from "@/services/sewing.service";
import { SewingForm } from "./sewing-form";

const pct = (n: number | null) => (n === null ? "-" : `${n}%`);

export default async function SewingPage(props: { searchParams: Promise<{ lineId?: string; date?: string }> }) {
  const sp = await props.searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const lineId = sp.lineId ?? "";

  const opts = await sewingService.formOptions();
  const line = opts.lines.find((l) => l.id === lineId);
  const day = line ? await sewingService.lineDay(line.id, date).catch(() => null) : null;
  const orders = line ? opts.orders.filter((o) => o.factoryId === line.factoryId) : [];

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader title="Sewing" description="Hourly target and output of a sewing line" />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="lineId" className="mb-1 block text-sm font-medium">
            Line
          </label>
          <select
            id="lineId"
            name="lineId"
            defaultValue={lineId}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select line...</option>
            {opts.lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <Input id="date" name="date" type="date" defaultValue={date} />
        </div>
        <Button type="submit">Show</Button>
      </form>

      {!line && <p className="text-sm text-muted-foreground">Pick a line and a date to see the hourly log.</p>}

      {line && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {line.label} on {date}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Hour</TableHead>
                    <TableHead>Production order</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Reject</TableHead>
                    <TableHead className="text-right">Rework</TableHead>
                    <TableHead className="text-right">Downtime</TableHead>
                    <TableHead className="text-right">Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!day || day.hours.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">
                        Nothing recorded for this day yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    day.hours.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">
                          {h.hour}:00 - {h.hour + 1}:00
                        </TableCell>
                        <TableCell>{h.productionOrder.productionNo}</TableCell>
                        <TableCell className="text-right">{h.target}</TableCell>
                        <TableCell className="text-right">{h.output}</TableCell>
                        <TableCell className="text-right">{h.reject}</TableCell>
                        <TableCell className="text-right">{h.rework}</TableCell>
                        <TableCell className="text-right">
                          {h.downtimeMinutes > 0 ? `${h.downtimeMinutes} min (${h.downtimeReason ?? ""})` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{pct(h.efficiencyPct)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {day && day.hours.length > 0 && (
                  <TableBody>
                    <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
                      <TableCell colSpan={2}>Day total</TableCell>
                      <TableCell className="text-right">{day.total.target}</TableCell>
                      <TableCell className="text-right">{day.total.output}</TableCell>
                      <TableCell className="text-right">{day.total.reject}</TableCell>
                      <TableCell className="text-right">{day.total.rework}</TableCell>
                      <TableCell className="text-right">{day.total.downtimeMinutes} min</TableCell>
                      <TableCell className="text-right">{pct(day.total.efficiencyPct)}</TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </CardContent>
          </Card>

          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No production order is running in this line&apos;s factory. Start one to record output.
            </p>
          ) : (
            <SewingForm key={`${line.id}-${date}`} lineId={line.id} date={date} orders={orders} />
          )}
        </>
      )}
    </div>
  );
}