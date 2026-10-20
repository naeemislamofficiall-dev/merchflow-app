import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/detail/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { subcontractService } from "@/services/subcontract.service";

const STATUSES = ["SENT", "VENDOR_RECEIVED", "IN_PROCESS", "RETURNED", "QC_DONE", "CLOSED", "CANCELLED"] as const;
const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function SubcontractPage(props: {
  searchParams: Promise<{ status?: string; overdue?: string }>;
}) {
  const sp = await props.searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const overdueOnly = sp.overdue === "1";

  const list = await subcontractService.list({ ...(status ? { status } : {}), overdueOnly });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subcontract"
        description="Goods sent outside for printing, embroidery or washing, and what comes back"
        actions={
          <Link href="/subcontract/new" className={buttonVariants()}>
            Send goods
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="overdue" value="1" defaultChecked={overdueOnly} />
          Overdue only
        </label>
        <Button type="submit">Filter</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Subcontract</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Production order</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No subcontract orders found
                  </TableCell>
                </TableRow>
              ) : (
                list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/subcontract/${s.id}`} className="font-medium text-denim-700 hover:underline">
                        {s.subcontractNo}
                      </Link>
                    </TableCell>
                    <TableCell>{s.vendor.name}</TableCell>
                    <TableCell className="capitalize">{s.process.toLowerCase()}</TableCell>
                    <TableCell>{s.productionOrder.productionNo}</TableCell>
                    <TableCell className="text-right">{s.sentQty}</TableCell>
                    <TableCell className="text-right">{s.balanceQty}</TableCell>
                    <TableCell className={s.isOverdue ? "text-destructive" : ""}>
                      {day(s.dueDate)}
                      {s.isOverdue ? " (late)" : ""}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
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