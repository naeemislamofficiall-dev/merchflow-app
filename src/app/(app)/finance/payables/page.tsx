import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apService } from "@/services/ap.service";
import { supplierService } from "@/services/supplier.service";

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function PayablesPage() {
  const [list, overdue, suppliers] = await Promise.all([
    apService.list(),
    apService.overdue(),
    supplierService.list({ activeOnly: true }).catch(() => []),
  ]);
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const overdueTotal = overdue.reduce((s, r) => s + r.outstanding * Number(r.exchangeRate), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payables"
        description="Supplier invoices: enter, match with the PO, post, then pay"
        actions={
          <Link href="/finance/payables/new" className={buttonVariants()}>
            New supplier invoice
          </Link>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue invoices</p>
            <p className="text-2xl font-semibold">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue amount (base currency)</p>
            <p className="text-2xl font-semibold">{money(overdueTotal)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Supplier invoice no</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No supplier invoices yet
                  </TableCell>
                </TableRow>
              ) : (
                list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link href={`/finance/payables/${i.id}`} className="font-medium text-denim-700 hover:underline">
                        {i.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell>{supplierName.get(i.supplierId) ?? "-"}</TableCell>
                    <TableCell>{i.supplierInvoiceNo}</TableCell>
                    <TableCell className="text-right">
                      {money(Number(i.totalAmount))} {i.currency}
                    </TableCell>
                    <TableCell className="text-right">{money(Number(i.paidAmount))}</TableCell>
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