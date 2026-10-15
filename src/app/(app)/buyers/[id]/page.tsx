import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { buyerService } from "@/services/buyer.service";
import { orderService } from "@/services/order.service";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "details", label: "Details" },
  { key: "transactions", label: "Orders" },
];

const num = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

export default async function BuyerDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const buyer = await buyerService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!buyer) notFound();

  const summary = await buyerService.summary(id);
  // Orders tab: order.view permission না থাকলে ফাঁকা
  const orders = tab === "transactions" ? await orderService.list({ buyerId: id }).catch(() => []) : [];

  return (
    <DetailPage
      code={buyer.code}
      title={buyer.name}
      status={buyer.status}
      basePath={`/buyers/${id}`}
      tabs={TABS}
      activeTab={tab}
      kpis={[
        { label: "Active orders", value: summary.activeOrders },
        { label: "Order value", value: `${summary.currency} ${num(summary.totalOrderValue)}` },
        { label: "Units", value: num(summary.units) },
        { label: "Shipments (30d)", value: summary.upcomingShipments30d },
        { label: "Open samples", value: summary.openSamples },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/buyers/${id}?tab=transactions`} className="block text-denim-700 hover:underline">
              Orders of this buyer
            </Link>
          </SidePanelSection>
          <SidePanelSection title="Alerts">
            <p className="text-muted-foreground">No alerts for this buyer.</p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">Add a contact and the buyer configuration.</p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Country" value={buyer.country} />
              <Row label="Region" value={buyer.region} />
              <Row label="Category" value={buyer.category} />
              <Row label="Currency" value={buyer.currency} />
              <Row label="Payment terms" value={buyer.paymentTerms} />
              <Row label="Shipment terms" value={buyer.shipmentTerms} />
              <Row label="Address" value={buyer.address} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {buyer.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet</p>
              ) : (
                buyer.contacts.map((c) => (
                  <div key={c.id} className="border-b py-2 text-sm last:border-0">
                    <p className="font-medium">
                      {c.name} {c.isPrimary && <span className="text-xs text-gold-600">(primary)</span>}
                    </p>
                    <p className="text-muted-foreground">
                      {[c.designation, c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Buyer configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Size system" value={buyer.config?.sizeSystem} />
            <Row label="Color coding" value={buyer.config?.colorCoding} />
            <Row label="Label requirements" value={buyer.config?.labelRequirements} />
            <Row label="Packing rules" value={buyer.config?.packingRules} />
            <Row label="AQL standard" value={buyer.config?.aqlStandard} />
            <Row label="Inspection requirements" value={buyer.config?.inspectionRequirements} />
            <Row label="Document requirements" value={buyer.config?.documentRequirements} />
            <Row
              label="Shipment tolerance %"
              value={buyer.config?.shipmentTolerancePct ? String(buyer.config.shipmentTolerancePct) : null}
            />
            <Row label="Compliance notes" value={buyer.complianceNotes} />
            <Row
              label="Preferred factories"
              value={buyer.preferredFactories.map((p) => p.factory.name).join(", ")}
            />
          </CardContent>
        </Card>
      )}

      {tab === "transactions" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Order</TableHead>
                <TableHead>Buyer PO</TableHead>
                <TableHead>Ship date</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No orders
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNo}</TableCell>
                    <TableCell>{o.buyerPoNo ?? "-"}</TableCell>
                    <TableCell>{o.shipDate ? o.shipDate.toISOString().slice(0, 10) : "-"}</TableCell>
                    <TableCell>{num(o.lines.reduce((s, l) => s + l.quantity, 0))}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </DetailPage>
  );
}