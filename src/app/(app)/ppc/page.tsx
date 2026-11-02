import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { dateKey } from "@/lib/capacity-calc";
import { ppcService } from "@/services/ppc.service";
import { AllocateForm, AllocationList, HolidayManager } from "./ppc-controls";

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Prottek production order-er jonno alada rong (Gantt-style bar)
const PALETTE = [
  "bg-blue-100 border-blue-300",
  "bg-emerald-100 border-emerald-300",
  "bg-violet-100 border-violet-300",
  "bg-amber-100 border-amber-300",
  "bg-pink-100 border-pink-300",
  "bg-cyan-100 border-cyan-300",
];

const field = "h-9 rounded-md border bg-background px-2 text-sm";

export default async function PpcPage(props: {
  searchParams: Promise<{ factoryId?: string; from?: string; days?: string }>;
}) {
  const sp = await props.searchParams;
  const options = await ppcService.formOptions();
  const factoryId = sp.factoryId || options.factories[0]?.id;

  if (!factoryId) {
    return (
      <div className="space-y-4">
        <PageHeader title="Production planning" description="Plan lines against confirmed orders" />
        <p className="text-sm text-muted-foreground">No factory is available in your scope.</p>
      </div>
    );
  }

  const from = sp.from || dateKey(new Date());
  const days = Math.min(Math.max(Number(sp.days) || 14, 7), 31);
  const to = addDays(from, days - 1);

  const [board, unplanned, holidays] = await Promise.all([
    ppcService.board({ factoryId, from, to }),
    ppcService.unplanned({ factoryId }),
    ppcService.listHolidays({ factoryId, from, to }),
  ]);

  const lineOpts = options.lines.filter((l) => l.factoryId === factoryId).map((l) => ({ id: l.id, label: `${l.code} - ${l.name}` }));
  const lineCode = new Map(board.lines.map((l) => [l.id, l.code]));
  const colorOf = new Map<string, string>();
  for (const a of board.allocations) {
    if (!colorOf.has(a.productionOrderId)) colorOf.set(a.productionOrderId, PALETTE[colorOf.size % PALETTE.length]);
  }
  const byCell = new Map<string, typeof board.allocations>();
  for (const a of board.allocations) {
    const k = `${a.lineId}|${a.dateKey}`;
    byCell.set(k, [...(byCell.get(k) ?? []), a]);
  }
  const overloadedCount = board.lines.reduce((s, l) => s + Object.values(l.cells).filter((c) => c.overloaded).length, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Production planning"
        description="Lines by day. Overloaded days are shown in red. Overload is a warning, not a block."
        actions={
          <Link href={`/ppc/capacity?factoryId=${factoryId}`} className={buttonVariants({ variant: "outline" })}>
            Capacity vs load
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Factory</span>
          <select name="factoryId" defaultValue={factoryId} className={field}>
            {options.factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">From</span>
          <input type="date" name="from" defaultValue={from} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Days</span>
          <select name="days" defaultValue={String(days)} className={field}>
            {[7, 14, 21, 31].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Show
        </button>
      </form>

      {overloadedCount > 0 && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {overloadedCount} line-day(s) are overloaded in this range.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Planning board</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {board.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">This factory has no active lines.</p>
          ) : (
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background px-2 py-1 text-left">Line</th>
                  {board.days.map((d) => (
                    <th
                      key={d.key}
                      title={d.holiday ?? undefined}
                      className={`min-w-28 border px-2 py-1 font-medium ${d.off ? "bg-muted text-muted-foreground" : ""}`}
                    >
                      {d.key.slice(5)}
                      {d.holiday && <div className="font-normal">{d.holiday}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="sticky left-0 z-10 bg-background px-2 py-1 align-top font-medium">
                      {l.code}
                      <div className="font-normal text-muted-foreground">
                        {l.missingData ? "no operators" : `${l.minutesPerDay} min/day`}
                      </div>
                    </td>
                    {board.days.map((d) => {
                      const cell = l.cells[d.key];
                      const items = byCell.get(`${l.id}|${d.key}`) ?? [];
                      return (
                        <td
                          key={d.key}
                          className={`border p-1 align-top ${
                            cell.overloaded ? "border-red-400 bg-red-50" : d.off ? "bg-muted/50" : ""
                          }`}
                        >
                          <div className="space-y-1">
                            {items.map((a) => (
                              <div
                                key={a.id}
                                className={`rounded border px-1 py-0.5 ${colorOf.get(a.productionOrderId)} ${
                                  a.status === "RELEASED" ? "border-l-4" : "border-dashed"
                                }`}
                                title={`${a.productionNo} / ${a.styleNo} / ${a.status}`}
                              >
                                {a.productionNo.slice(-9)} · {a.plannedQty}
                              </div>
                            ))}
                            {cell.plannedMinutes > 0 && (
                              <div className={cell.overloaded ? "font-medium text-red-700" : "text-muted-foreground"}>
                                {cell.plannedMinutes}/{cell.availableMinutes} min
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Dashed bar = planned. Solid left edge = released.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocateForm
            defaultDate={from}
            lines={lineOpts}
            orders={unplanned.map((u) => ({
              id: u.id,
              label: `${u.productionNo} · ${u.styleNo} · ${u.remainingQty} pcs left${u.smv ? "" : " (no SMV)"}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production orders still to plan ({unplanned.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {unplanned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every open production order is fully allocated.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {["Production", "Order", "Style", "Qty", "Allocated", "Left", "Dates", "SMV"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unplanned.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/production-orders/${u.id}`} className="text-denim-700 hover:underline">
                        {u.productionNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{u.orderNo}</td>
                    <td className="px-3 py-2">{u.styleNo}</td>
                    <td className="px-3 py-2">{u.quantity}</td>
                    <td className="px-3 py-2">{u.allocatedQty}</td>
                    <td className="px-3 py-2 font-medium">{u.remainingQty}</td>
                    <td className="px-3 py-2">
                      {dateKey(u.startDate)} to {dateKey(u.endDate)}
                    </td>
                    <td className="px-3 py-2">{u.smv ?? "missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocations in this range</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationList
            lines={lineOpts}
            items={board.allocations.map((a) => ({
              id: a.id,
              productionNo: a.productionNo,
              styleNo: a.styleNo,
              lineId: a.lineId,
              lineCode: lineCode.get(a.lineId) ?? "",
              dateKey: a.dateKey,
              plannedQty: a.plannedQty,
              status: a.status,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factory holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <HolidayManager
            factoryId={factoryId}
            holidays={holidays.map((h) => ({ id: h.id, dateKey: dateKey(h.date), reason: h.reason }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
