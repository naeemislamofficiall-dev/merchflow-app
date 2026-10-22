import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "@/components/crud/crud-kit";
import { BusinessRuleError } from "@/lib/business-rules";
import { stockTransferService } from "@/services/stock-transfer.service";
import { cancelTransferAction, completeTransferAction, removeTransferLineAction } from "../actions";
import { LinePanel } from "./line-panel";

export default async function StockTransferDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const data = await stockTransferService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!data) notFound();
  const { transfer: t } = data;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.transferNo}
        description={`${data.fromName} → ${data.toName}${t.remarks ? ` · ${t.remarks}` : ""}`}
        actions={
          <>
            <StatusBadge status={t.status} />
            <Link href="/stock-transfers" className="text-sm text-primary hover:underline">
              All transfers
            </Link>
          </>
        }
      />
      {data.canEdit && data.lines.length > 0 && (
        <RowActions
          id={t.id}
          actions={[
            {
              label: "Complete transfer",
              variant: "gold",
              confirm: "Complete this transfer? Stock will move now.",
              action: completeTransferAction,
            },
            { label: "Cancel transfer", reason: "Why is this transfer being cancelled?", action: cancelTransferAction },
          ]}
        />
      )}
      {data.canEdit && data.lines.length === 0 && (
        <RowActions
          id={t.id}
          actions={[{ label: "Cancel transfer", reason: "Why is this transfer being cancelled?", action: cancelTransferAction }]}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>From bin</TableHead>
                <TableHead>To bin</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No lines yet
                  </TableCell>
                </TableRow>
              ) : (
                data.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.material}</TableCell>
                    <TableCell>{l.lotNo || "-"}</TableCell>
                    <TableCell>{l.rollNo || "-"}</TableCell>
                    <TableCell>{l.fromBin || "-"}</TableCell>
                    <TableCell>{l.toBin || "-"}</TableCell>
                    <TableCell className="text-right">
                      {l.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })} {l.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.canEdit && (
                        <RowActions id={l.id} actions={[{ label: "Remove", action: removeTransferLineAction }]} />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data.canEdit && <LinePanel id={t.id} sources={data.sources} toBins={data.toBins} />}
    </div>
  );
}
