import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { packingListService } from "@/services/packing-list.service";
import { PackingListActions } from "./list-actions";

const n = (v: number | null) => (v === null ? "-" : v.toLocaleString("en-US", { maximumFractionDigits: 3 }));

export default async function PackingListDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();

  const data = await packingListService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!data) notFound();
  const { row, snapshot: s } = data;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Packing list ${row.packingListNo}`}
        description={`${s.shipmentNo} · ${s.buyerName} · ${s.mode.toLowerCase()}${s.destination ? ` to ${s.destination}` : ""}`}
        actions={
          <>
            <StatusBadge status={row.status} />
            <Link href="/packing/packing-lists" className="text-sm text-primary hover:underline print:hidden">
              All packing lists
            </Link>
          </>
        }
      />
      <PackingListActions id={row.id} status={row.status} canEdit={can(user, "packing.edit")} />
      {row.status === "CANCELLED" && row.cancelReason && (
        <p className="text-sm text-muted-foreground">Cancelled: {row.cancelReason}</p>
      )}
      {row.status === "DRAFT" && (
        <p className="text-sm text-muted-foreground print:hidden">
          This is a draft. Use Refresh if cartons changed in the shipment, then Issue to freeze it.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Cartons", String(row.totalCartons)],
          ["Pieces", row.totalPcs.toLocaleString()],
          ["Gross kg", n(Number(row.totalGrossKg))],
          ["Net kg", n(Number(row.totalNetKg))],
          ["CBM", n(Number(row.totalCbm))],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Carton</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead className="text-right">Pcs</TableHead>
                <TableHead className="text-right">Gross kg</TableHead>
                <TableHead className="text-right">Net kg</TableHead>
                <TableHead className="text-right">L×W×H cm</TableHead>
                <TableHead className="text-right">CBM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.cartons.map((c) => (
                <TableRow key={c.cartonNo}>
                  <TableCell className="font-medium">{c.cartonNo}</TableCell>
                  <TableCell>{c.orderNo}</TableCell>
                  <TableCell>
                    {c.lines.map((l, i) => (
                      <div key={i}>
                        {l.styleNo} · {l.color} · {l.size} × {l.qty}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">{c.pcs.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{n(c.grossKg)}</TableCell>
                  <TableCell className="text-right">{n(c.netKg)}</TableCell>
                  <TableCell className="text-right">
                    {c.lengthCm && c.widthCm && c.heightCm ? `${c.lengthCm}×${c.widthCm}×${c.heightCm}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">{n(c.cbm)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {row.remarks && <p className="text-sm text-muted-foreground">Remarks: {row.remarks}</p>}
    </div>
  );
}
