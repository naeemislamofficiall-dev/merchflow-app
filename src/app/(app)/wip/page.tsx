import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { wipService } from "@/services/wip.service";

export default async function WipPage() {
  const rows = await wipService.open();

  return (
    <div className="space-y-4">
      <PageHeader title="WIP" description="Where the pieces are right now, for every running production order" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Production order</TableHead>
                <TableHead>Order / style</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Cut</TableHead>
                <TableHead className="text-right">Sewn</TableHead>
                <TableHead className="text-right">Finished</TableHead>
                <TableHead className="text-right">Packed</TableHead>
                <TableHead className="text-right">Shipped</TableHead>
                <TableHead className="text-right">In sewing</TableHead>
                <TableHead className="text-right">In finishing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={11} className="h-20 text-center text-muted-foreground">
                    No running production orders
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.productionOrderId}>
                    <TableCell>
                      <Link
                        href={`/production-orders/${r.productionOrderId}`}
                        className="font-medium text-denim-700 hover:underline"
                      >
                        {r.productionNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.orderNo} / {r.styleNo}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">{r.planned}</TableCell>
                    <TableCell className="text-right">{r.cut}</TableCell>
                    <TableCell className="text-right">{r.sewn}</TableCell>
                    <TableCell className="text-right">{r.finished}</TableCell>
                    <TableCell className="text-right">{r.packed}</TableCell>
                    <TableCell className="text-right">{r.shipped}</TableCell>
                    <TableCell className="text-right">{r.balances.inSewing}</TableCell>
                    <TableCell className="text-right">{r.balances.inFinishing}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}