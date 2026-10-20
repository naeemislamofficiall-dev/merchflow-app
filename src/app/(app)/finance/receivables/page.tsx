import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { arService } from "@/services/ar.service";
import { buyerService } from "@/services/buyer.service";

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function ReceivablesPage() {
  const [list, overdue, buyers] = await Promise.all([
    arService.list(),
    arService.overdue(),
    buyerService.list().catch(() => []),
  ]);
  const buyerName = new Map(buyers.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receivables"
        description="Invoices to buyers: create, post, then record receipts"
        actions={
          <Link href="/finance/receivables/new" className={buttonVariants()}>
            New buyer invoice
          </Link>
        }
      />
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Overdue invoices</p>
          <p className="text-2xl font-semibold">{overdue.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No buyer invoices yet
                  </TableCell>
                </TableRow>
              ) : (
                list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link href={`/finance/receivables/${i.id}`} className="font-medium text-denim-700 hover:underline">
                        {i.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell>{buyerName.get(i.buyerId) ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {money(Number(i.totalAmount))} {i.currency}
                    </TableCell>
                    <TableCell className="text-right">{money(Number(i.receivedAmount))}</TableCell>
                    <TableCell>{day(i.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
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