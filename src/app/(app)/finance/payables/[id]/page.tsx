import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { apService } from "@/services/ap.service";
import { InvoicePanel } from "../../invoice-panel";

const TABS: DetailTab[] = [{ key: "payments", label: "Payments" }];

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  DRAFT: "Match with the PO, then post. A mismatch needs an override reason.",
  POSTED: "Waiting for payment.",
  PARTIALLY_PAID: "Part paid. Record the next payment.",
  PAID: "Fully paid.",
  CANCELLED: "This invoice was cancelled.",
};

export default async function PayableDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const inv = await apService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!inv) notFound();

  const total = Number(inv.totalAmount);
  const paid = Number(inv.paidAmount);
  const outstanding = Math.round((total - paid) * 100) / 100;

  return (
    <DetailPage
      code={inv.supplierInvoiceNo}
      title={inv.invoiceNo}
      status={inv.status}
      basePath={`/finance/payables/${id}`}
      tabs={TABS}
      activeTab="payments"
      kpis={[
        { label: `Total (${inv.currency})`, value: money(total) },
        { label: "Paid", value: money(paid) },
        { label: "Outstanding", value: money(outstanding) },
        { label: "Due", value: day(inv.dueDate) },
      ]}
      side={
        <>
          <SidePanelSection title="Match with PO">
            <p className="text-muted-foreground">Result: {inv.matchStatus ?? "not matched"}</p>
            {inv.matchNote && <p className="text-muted-foreground">{inv.matchNote}</p>}
            {inv.poId && (
              <Link href={`/purchase-orders/${inv.poId}`} className="block text-denim-700 hover:underline">
                View PO
              </Link>
            )}
          </SidePanelSection>
          <SidePanelSection title="Amounts">
            <p className="text-muted-foreground">Subtotal: {money(Number(inv.subtotal))}</p>
            <p className="text-muted-foreground">Tax: {money(Number(inv.taxAmount))}</p>
            <p className="text-muted-foreground">Rate to base: {Number(inv.exchangeRate)}</p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[inv.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Payment</TableHead>
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
                      No payments yet
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

        <InvoicePanel kind="ap" invoiceId={id} status={inv.status} hasPo={!!inv.poId} outstanding={outstanding} />
      </div>
    </DetailPage>
  );
}