import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ieService } from "@/services/ie.service";
import { styleService } from "@/services/style.service";
import { BulletinForm } from "./bulletin-form";

export default async function IePage(props: {
  searchParams: Promise<{ styleId?: string; targetPerHour?: string; efficiencyPct?: string }>;
}) {
  const sp = await props.searchParams;
  const styles = await styleService.list().catch(() => []);
  const style = styles.find((s) => s.id === sp.styleId);

  const bulletin = style ? await ieService.bulletin(style.id).catch(() => null) : null;

  const target = Number(sp.targetPerHour);
  const eff = sp.efficiencyPct ? Number(sp.efficiencyPct) : undefined;
  const wantsBalance = !!style && !!bulletin && bulletin.operations.length > 0 && target > 0;
  let balance: Awaited<ReturnType<typeof ieService.lineBalance>> | null = null;
  let balanceError = "";
  if (wantsBalance && style) {
    try {
      balance = await ieService.lineBalance({
        styleId: style.id,
        targetPerHour: target,
        ...(eff !== undefined && eff > 0 ? { efficiencyPct: eff } : {}),
      });
    } catch (e) {
      balanceError = e instanceof Error ? e.message : "Could not work out the line balance";
    }
  }

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title="Industrial engineering"
        description="Operation bulletin (SMV of every operation) and line balancing for a style"
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="styleId" className="mb-1 block text-sm font-medium">
            Style
          </label>
          <select
            id="styleId"
            name="styleId"
            defaultValue={style?.id ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select...</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.styleNo} - {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Show</Button>
      </form>

      {!style && <p className="text-sm text-muted-foreground">Pick a style to see or edit its operation bulletin.</p>}

      {style && bulletin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {style.styleNo}: bulletin (total SMV {bulletin.totalSmv})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>#</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead className="text-right">SMV</TableHead>
                    <TableHead className="text-right">Operators</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulletin.operations.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                        No operations yet. Add them below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bulletin.operations.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.seq}</TableCell>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell>{o.machineType ?? "-"}</TableCell>
                        <TableCell>{o.skillLevel ?? "-"}</TableCell>
                        <TableCell className="text-right">{o.smv}</TableCell>
                        <TableCell className="text-right">{o.operators}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {bulletin.operations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Line balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form method="get" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="styleId" value={style.id} />
                  <div>
                    <label htmlFor="targetPerHour" className="mb-1 block text-sm font-medium">
                      Target pieces per hour
                    </label>
                    <Input id="targetPerHour" name="targetPerHour" type="number" step="any" min="0" defaultValue={sp.targetPerHour ?? ""} />
                  </div>
                  <div>
                    <label htmlFor="efficiencyPct" className="mb-1 block text-sm font-medium">
                      Efficiency % (blank = 100)
                    </label>
                    <Input id="efficiencyPct" name="efficiencyPct" type="number" step="any" min="0" max="100" defaultValue={sp.efficiencyPct ?? ""} />
                  </div>
                  <Button type="submit">Work out</Button>
                </form>

                {balanceError && <p className="text-sm text-destructive">{balanceError}</p>}

                {balance && (
                  <>
                    <div className="grid gap-3 md:grid-cols-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Operators now / needed</p>
                        <p className="text-lg font-semibold">
                          {balance.totalOperators} / {balance.neededOperatorsTotal}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Line can make per hour</p>
                        <p className="text-lg font-semibold">{balance.lineOutputPerHour}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Balance efficiency</p>
                        <p className="text-lg font-semibold">{balance.balanceEfficiencyPct}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total SMV</p>
                        <p className="text-lg font-semibold">{balance.totalSmv}</p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>#</TableHead>
                          <TableHead>Operation</TableHead>
                          <TableHead className="text-right">Operators</TableHead>
                          <TableHead className="text-right">Needed</TableHead>
                          <TableHead className="text-right">Capacity / hr</TableHead>
                          <TableHead className="text-right">Load %</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balance.operations.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell>{o.seq}</TableCell>
                            <TableCell className="font-medium">{o.name}</TableCell>
                            <TableCell className="text-right">{o.operators}</TableCell>
                            <TableCell className="text-right">{o.neededOperators}</TableCell>
                            <TableCell className="text-right">{o.capacityPerHour}</TableCell>
                            <TableCell className={`text-right ${o.bottleneck ? "text-destructive" : ""}`}>
                              {o.utilizationPct}%
                            </TableCell>
                            <TableCell>
                              {o.bottleneck ? "Bottleneck: below target" : o.slowest ? "Slowest operation" : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <BulletinForm
            key={`${style.id}-${bulletin.operations.length}-${bulletin.totalSmv}`}
            styleId={style.id}
            initial={bulletin.operations.map((o) => ({
              name: o.name,
              machineType: o.machineType ?? "",
              smv: String(o.smv),
              skillLevel: o.skillLevel ?? "",
              operators: String(o.operators),
            }))}
          />
        </>
      )}
    </div>
  );
}