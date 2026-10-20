import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buyerService } from "@/services/buyer.service";
import { orderService } from "@/services/order.service";
import { profitabilityService } from "@/services/profitability.service";
import { styleService } from "@/services/style.service";

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n: number | null) => (n === null ? "-" : `${n}%`);

export default async function ProfitabilityPage(props: { searchParams: Promise<{ orderId?: string }> }) {
  const sp = await props.searchParams;

  const [byBuyer, orders, buyers, styles] = await Promise.all([
    profitabilityService.byBuyer(),
    orderService.list().catch(() => []),
    buyerService.list().catch(() => []),
    styleService.list().catch(() => []),
  ]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));
  const styleNo = new Map(styles.map((s) => [s.id, s.styleNo]));
  const selected = orders.find((o) => o.id === sp.orderId);
  const detail = selected ? await profitabilityService.byOrder(selected.id).catch(() => null) : null;

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title="Profitability"
        description="Revenue from posted buyer invoices minus cost from approved invoices and expenses (base currency)"
      />

      <Card>
        <CardHeader>
          <CardTitle>By buyer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byBuyer.buyers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    Nothing to show yet. Post a buyer invoice first.
                  </TableCell>
                </TableRow>
              ) : (
                byBuyer.buyers.map((b) => (
                  <TableRow key={b.buyerId}>
                    <TableCell className="font-medium">{buyerName.get(b.buyerId) ?? "-"}</TableCell>
                    <TableCell className="text-right">{money(b.revenue)}</TableCell>
                    <TableCell className="text-right">{money(b.cost)}</TableCell>
                    <TableCell className={`text-right ${b.margin < 0 ? "text-destructive" : ""}`}>{money(b.margin)}</TableCell>
                    <TableCell className="text-right">{pct(b.marginPct)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By order</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byBuyer.orders.map((o) => (
                <TableRow key={o.orderId}>
                  <TableCell>
                    <Link
                      href={`/finance/profitability?orderId=${o.orderId}`}
                      className="font-medium text-denim-700 hover:underline"
                    >
                      {o.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{money(o.revenue)}</TableCell>
                  <TableCell className="text-right">{money(o.cost)}</TableCell>
                  <TableCell className={`text-right ${o.margin < 0 ? "text-destructive" : ""}`}>{money(o.margin)}</TableCell>
                  <TableCell className="text-right">{pct(o.marginPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && detail && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.orderNo}: by style</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Style</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.styles.map((s) => (
                  <TableRow key={s.styleId ?? "_none"}>
                    <TableCell className="font-medium">
                      {s.styleId ? (styleNo.get(s.styleId) ?? "-") : "Not assigned to a style"}
                    </TableCell>
                    <TableCell className="text-right">{money(s.revenue)}</TableCell>
                    <TableCell className="text-right">{money(s.cost)}</TableCell>
                    <TableCell className={`text-right ${s.margin < 0 ? "text-destructive" : ""}`}>{money(s.margin)}</TableCell>
                    <TableCell className="text-right">{pct(s.marginPct)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{money(detail.total.revenue)}</TableCell>
                  <TableCell className="text-right">{money(detail.total.cost)}</TableCell>
                  <TableCell className="text-right">{money(detail.total.margin)}</TableCell>
                  <TableCell className="text-right">{pct(detail.total.marginPct)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!selected && byBuyer.orders.length > 0 && (
        <p className="text-sm text-muted-foreground">Click an order to see its margin by style.</p>
      )}
      <form method="get" className="hidden">
        <Button type="submit">Refresh</Button>
      </form>
    </div>
  );
}