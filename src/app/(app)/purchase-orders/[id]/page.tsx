import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { poTotals } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { poService } from "@/services/po.service";
import { PoActions } from "./po-actions";

const TABS: DetailTab[] = [{ key: "lines", label: "Lines" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  DRAFT: "Check the rates, then submit for approval.",
  SUBMITTED: "Waiting for approval.",
  APPROVED: "Send the PO to the supplier.",
  SENT: "Waiting for the supplier to acknowledge.",
  ACKNOWLEDGED: "Waiting for goods. Receiving is done through a goods receipt (GRN).",
  PARTIAL_RECEIPT: "Part of the goods has arrived. Receive the rest.",
  COMPLETE: "Everything is received. Close the PO.",
  CLOSED: "This PO is closed.",
  REJECTED: "Revise the PO and submit it again. The rejection reason is shown above.",
  REVISION: "Fix the PO and submit again.",
  CANCELLED: "This PO was cancelled.",
};

export default async function PoDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const po = await poService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!po) notFound();

  const totals = poTotals(
    po.lines.map((l) => ({ quantity: Number(l.quantity), rate: Number(l.rate), taxPct: Number(l.taxPct) }))
  );
  const followUp = po.followUps[0];

  return (
    <DetailPage
      code={po.supplier.name}
      title={po.poNo}
      status={po.status}
      basePath={`/purchase-orders/${id}`}
      tabs={TABS}
      activeTab="lines"
      actions={<PoActions poId={id} status={po.status} />}
      kpis={[
        { label: "Lines", value: po.lines.length },
        { label: `Total (${po.currency})`, value: money(totals.grandTotal) },
        { label: "Delivery", value: day(po.deliveryDate) },
        { label: "Created", value: day(po.createdAt) },
      ]}
      side={
        <>
          {po.rejectionReason && (
            <SidePanelSection title="Rejection reason">
              <p className="text-destructive">{po.rejectionReason}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Terms">
            <p className="text-muted-foreground">Payment: {po.paymentTerms ?? "-"}</p>
            <p className="text-muted-foreground">Incoterms: {po.incoterms ?? "-"}</p>
            <p className="text-muted-foreground">Destination: {po.destination ?? "-"}</p>
          </SidePanelSection>
          <SidePanelSection title="Supplier follow-up">
            {followUp ? (
              <>
                <p className="text-muted-foreground">Promised: {day(followUp.latestPromisedDate)}</p>
                <p className="text-muted-foreground">Delay: {followUp.delayDays} days</p>
              </>
            ) : (
              <p className="text-muted-foreground">Starts when the PO is sent.</p>
            )}
          </SidePanelSection>
          <SidePanelSection title="Proforma invoices">
            {po.proformaInvoices.length === 0 ? (
              <p className="text-muted-foreground">None recorded.</p>
            ) : (
              po.proformaInvoices.map((pi) => (
                <p key={pi.id} className="text-muted-foreground">
                  {pi.piNo}: {money(Number(pi.amount))} {pi.currency}
                </p>
              ))
            )}
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[po.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Ordered material</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Material</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Tax %</TableHead>
                <TableHead>Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.material.name}</p>
                    <p className="text-xs text-muted-foreground">{l.material.code}</p>
                  </TableCell>
                  <TableCell>
                    {l.order ? (
                      <Link href={`/orders/${l.orderId}`} className="text-denim-700 hover:underline">
                        {l.order.orderNo}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {fmt(Number(l.quantity))} {l.unit}
                  </TableCell>
                  <TableCell>{fmt(Number(l.receivedQty))}</TableCell>
                  <TableCell>
                    {money(Number(l.rate))} {po.currency}
                  </TableCell>
                  <TableCell>{fmt(Number(l.taxPct))}</TableCell>
                  <TableCell>{day(l.deliveryDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DetailPage>
  );
}
