import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/detail/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { followUpService } from "@/services/followup.service";
import { RefreshButton, RowActions } from "./follow-up-controls";

const day = (d: Date) => d.toISOString().slice(0, 10);

export default async function FollowUpsPage() {
  const rows = await followUpService.listOpen();
  const late = rows.filter((r) => r.liveDelayDays > 0).length;
  const escalated = rows.filter((r) => r.isEscalated).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Supplier follow-ups"
        description="Every open purchase order, with the supplier's promise and the delay so far"
        actions={<RefreshButton />}
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Open" value={rows.length} />
        <KpiCard label="Late" value={late} tone={late > 0 ? "bad" : "default"} />
        <KpiCard label="Escalated" value={escalated} tone={escalated > 0 ? "warn" : "default"} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>First promise</TableHead>
                <TableHead>Latest promise</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Last contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No open follow-ups. A follow-up is created when a PO is sent to the supplier
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((f) => {
                  const last = f.contacts.length
                    ? f.contacts.reduce((a, b) => (a.contactedAt > b.contactedAt ? a : b))
                    : null;
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Link href={`/purchase-orders/${f.po.id}`} className="font-medium text-denim-700 hover:underline">
                          {f.po.poNo}
                        </Link>
                      </TableCell>
                      <TableCell>{f.po.supplier.name}</TableCell>
                      <TableCell>{day(f.supplierPromisedDate)}</TableCell>
                      <TableCell>{day(f.latestPromisedDate)}</TableCell>
                      <TableCell>
                        {f.liveDelayDays > 0 ? (
                          <Badge variant="danger">{f.liveDelayDays} days late</Badge>
                        ) : (
                          <Badge variant="success">On time</Badge>
                        )}
                        {f.isEscalated && (
                          <Badge variant="warning" className="ml-1" title={f.escalationNote ?? ""}>
                            escalated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {last ? `${day(last.contactedAt)} · ${last.method}` : "-"}
                      </TableCell>
                      <TableCell>
                        <RowActions id={f.id} latest={day(f.latestPromisedDate)} escalated={f.isEscalated} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}