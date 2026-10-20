import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { subcontractService } from "@/services/subcontract.service";
import { SubcontractPanel } from "./subcontract-panel";

const TABS: DetailTab[] = [{ key: "returns", label: "Returns" }];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");
const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const NEXT: Record<string, string> = {
  SENT: "Wait for the vendor to confirm they got the goods.",
  VENDOR_RECEIVED: "Mark when the vendor starts the process.",
  IN_PROCESS: "Record the goods as they come back. Partial returns are fine.",
  RETURNED: "Record more returns, or mark QC done when everything is back.",
  QC_DONE: "Close the order. If pieces are missing you must give a reason.",
  CLOSED: "This order is closed.",
  CANCELLED: "This order was cancelled.",
};

export default async function SubcontractDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const s = await subcontractService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!s) notFound();

  return (
    <DetailPage
      code={`${s.process.toLowerCase()} by ${s.vendor.name}`}
      title={s.subcontractNo}
      status={s.status}
      basePath={`/subcontract/${id}`}
      tabs={TABS}
      activeTab="returns"
      kpis={[
        { label: "Sent", value: s.sentQty },
        { label: "Good returned", value: s.receivedQty },
        { label: "Damaged / rejected", value: `${s.damageQty} / ${s.rejectQty}` },
        { label: "Balance", value: s.balanceQty },
        { label: "Due", value: s.isOverdue ? `${day(s.dueDate)} (late)` : day(s.dueDate) },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/production-orders/${s.productionOrderId}`} className="block text-denim-700 hover:underline">
              Production {s.productionOrder.productionNo}
            </Link>
            <p className="text-muted-foreground">Challan: {s.challanNo}</p>
          </SidePanelSection>
          <SidePanelSection title="Cost">
            <p className="text-muted-foreground">
              Rate: {Number(s.rate)} {s.currency} per piece
            </p>
            <p className="text-muted-foreground">
              Wage for good pieces: {money(s.amount)} {s.currency}
            </p>
          </SidePanelSection>
          {s.closeReason && (
            <SidePanelSection title="Close reason">
              <p className="text-muted-foreground">{s.closeReason}</p>
            </SidePanelSection>
          )}
          {s.cancelReason && (
            <SidePanelSection title="Cancel reason">
              <p className="text-muted-foreground">{s.cancelReason}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[s.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Goods that came back</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Challan</TableHead>
                  <TableHead className="text-right">Good</TableHead>
                  <TableHead className="text-right">Damaged</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.receipts.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      Nothing has come back yet
                    </TableCell>
                  </TableRow>
                ) : (
                  s.receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{day(r.receiptDate)}</TableCell>
                      <TableCell>{r.challanNo ?? "-"}</TableCell>
                      <TableCell className="text-right">{r.receivedQty}</TableCell>
                      <TableCell className="text-right">{r.damageQty}</TableCell>
                      <TableCell className="text-right">{r.rejectQty}</TableCell>
                      <TableCell>{r.remarks ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <SubcontractPanel subcontractId={id} status={s.status} balance={s.balanceQty} />
      </div>
    </DetailPage>
  );
}