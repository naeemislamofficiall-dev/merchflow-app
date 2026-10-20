import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rfqService } from "@/services/rfq.service";

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

export default async function RfqsPage() {
  const list = await rfqService.list();

  return (
    <div className="space-y-4">
      <PageHeader
        title="RFQs"
        description="Ask suppliers for prices on the material of an approved purchase requisition"
        actions={
          <Link href="/rfqs/new" className={buttonVariants()}>
            New RFQ
          </Link>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>RFQ</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Suppliers</TableHead>
                <TableHead className="text-right">Quotations</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No RFQs yet
                  </TableCell>
                </TableRow>
              ) : (
                list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/rfqs/${r.id}`} className="font-medium text-denim-700 hover:underline">
                        {r.rfqNo}
                      </Link>
                    </TableCell>
                    <TableCell>{day(r.dueDate)}</TableCell>
                    <TableCell className="text-right">{r._count.lines}</TableCell>
                    <TableCell className="text-right">{r._count.suppliers}</TableCell>
                    <TableCell className="text-right">{r._count.quotations}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
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