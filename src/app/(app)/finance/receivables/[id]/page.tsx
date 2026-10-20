import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { arService } from "@/services/ar.service";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { InvoicePanel } from "../../invoice-panel";

const TABS: DetailTab[] = [{ key: "lines", label: "Lines and receipts" }];

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  DRAFT: "Check the lines, then post the invoice.",
  POSTED: "Waiting for the buyer to pay.",
  PARTIALLY_PAID: "Part received. Record the next receipt.",
  PAID: "Fully received.",
  CANCELLED: "This invoice was cancelled.",
};

export default async function ReceivableDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const inv = await arService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!inv) notFound();

  const [orders, styles] = await Promise.all([
    orderService.list().catch(() => []),
    styleService.list().catch(() => []),
  ]);
  const orderNo = new Map(orders.map((o) => [o.id, o.orderNo]));
  const styleNo = new Map(styles.map((s) => [s.id, s.styleNo]));

  const total = Number(inv.totalAmount);
  const received = Number(inv.receivedAmount);
  const outstanding = Math.round((total - received) * 100) / 100;

  return (
    <DetailPage
      code={inv.currency}
      title={inv.invoiceNo}
      status={inv.status}
      basePath={`/finance/receivables/${id}`}
      tabs={TABS}
      activeTab="lines"
      kpis={[
        { label: `Total (${inv.currency})`, value: money(total) },
        { label: "Received", value: money(received) },
        { label: "Outstanding", value: money(outstanding) },
        { label: "Due", value: day(inv.dueDate) },
      ]}
      side={
        <>
          {inv.shipmentId && (
            <SidePanelSection title="Related records">
              <Link href={`/shipments/${inv.shipmentId}`} className="block text-denim-700 hover:underline">
                View shipment
              </Link>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[inv.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{orderNo.get(l.orderId) ?? "-"}</TableCell>
                    <TableCell>{l.styleId ? (styleNo.get(l.styleId) ?? "-") : "-"}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{money(Number(l.unitPrice))}</TableCell>
                    <TableCell className="text-right">{money(Number(l.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.payments.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      No receipts yet
                    </TableCell>
                  </TableRow>
                ) : (
                  inv.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.paymentNo}</TableCell>
                      <TableCell>{day(p.paymentDate)}</TableCell>
                      <TableCell>{p.method.toLowerCase()}</TableCell>
                      <TableCell>{p.referenceNo ?? "-"}</TableCell>
                      <TableCell className="text-right">{money(Number(p.amount))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <InvoicePanel kind="ar" invoiceId={id} status={inv.status} hasPo={false} outstanding={outstanding} />
      </div>
    </DetailPage>
  );
}