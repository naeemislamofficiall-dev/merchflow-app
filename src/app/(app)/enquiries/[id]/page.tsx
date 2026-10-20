import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { enquiryTransitions } from "@/lib/status-rules";
import type { EnquiryStatus } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { enquiryService } from "@/services/enquiry.service";
import { styleService } from "@/services/style.service";
import { ConvertPanel } from "./convert-panel";
import { EnquiryActions } from "./enquiry-actions";
import { NegotiationForm } from "./negotiation-form";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "negotiation", label: "Negotiation" },
];

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const price = (n: unknown) => (n === null || n === undefined ? "-" : fmt(Number(n)));

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

const NEXT_TEXT: Record<string, string> = {
  DRAFT: "Send the enquiry to costing when the item details are complete.",
  COSTING: "Finish the costing, then start the negotiation with the buyer.",
  NEGOTIATION: "Record each price round in the Negotiation tab, then mark it as quoted.",
  QUOTED: "Waiting for the buyer. Approve it, or reopen the negotiation if they want a new price.",
  APPROVED: "Buyer agreed. Create the order from the Overview tab.",
  CONVERTED: "This enquiry is now an order.",
  CANCELLED: "This enquiry was cancelled.",
};

export default async function EnquiryDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const enq = await enquiryService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!enq) notFound();

  // CONVERTED-এ যাওয়া হয় শুধু "Create order" দিয়ে, তাই বোতামের তালিকা থেকে বাদ
  const next = (enquiryTransitions[enq.status] as EnquiryStatus[]).filter((s) => s !== "CONVERTED");
  const open = enq.status !== "CONVERTED" && enq.status !== "CANCELLED";

  const units = enq.items.reduce((s, i) => s + i.quantity, 0);
  const priced = enq.items.filter((i) => i.targetPrice !== null);
  const targetValue = priced.reduce((s, i) => s + i.quantity * Number(i.targetPrice), 0);
  const allLinked = enq.items.every((i) => !!i.styleId);

  const styleIds = [...new Set(enq.items.map((i) => i.styleId).filter((s): s is string => !!s))];
  const styles = await Promise.all(styleIds.map((sid) => styleService.get(sid).catch(() => null)));
  const styleNo = new Map(styles.filter((s) => s !== null).map((s) => [s.id, s.styleNo]));

  return (
    <DetailPage
      code={enq.enquiryNo}
      title={enq.buyer.name}
      status={enq.status}
      basePath={`/enquiries/${id}`}
      tabs={TABS}
      activeTab={tab}
      actions={<EnquiryActions enquiryId={id} status={enq.status} next={next} />}
      kpis={[
        { label: "Items", value: enq.items.length },
        { label: "Units", value: fmt(units) },
        { label: "Target value", value: priced.length > 0 ? `${enq.currency} ${fmt(targetValue)}` : "-" },
        { label: "Required ship", value: day(enq.requiredShipDate) },
        {
          label: "Styles linked",
          value: allLinked ? "All" : "Missing",
          tone: allLinked ? "good" : "warn",
        },
      ]}
      side={
        <>
          <SidePanelSection title="Buyer">
            <p>{enq.buyer.name}</p>
            <p className="text-muted-foreground">{enq.buyer.code}</p>
          </SidePanelSection>
          {enq.convertedOrderId && (
            <SidePanelSection title="Order">
              <Link href={`/orders/${enq.convertedOrderId}`} className="text-denim-700 hover:underline">
                Open the order
              </Link>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT_TEXT[enq.status] ?? "No action needed."}</p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry details</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Received" value={day(enq.receivedDate)} />
              <Row label="Required ship date" value={day(enq.requiredShipDate)} />
              <Row label="Currency" value={enq.currency} />
              <Row label="Product type" value={enq.productType} />
              <Row label="Fabric" value={enq.fabric} />
              <Row label="Notes" value={enq.notes} />
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Style</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Target price</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enq.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      {it.styleId ? (
                        <Link href={`/styles/${it.styleId}`} className="font-medium text-denim-700 hover:underline">
                          {styleNo.get(it.styleId) ?? "Style"}
                        </Link>
                      ) : (
                        <StatusBadge status="PENDING" />
                      )}
                    </TableCell>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>{fmt(it.quantity)}</TableCell>
                    <TableCell>{price(it.targetPrice)}</TableCell>
                    <TableCell>{it.targetPrice === null ? "-" : fmt(it.quantity * Number(it.targetPrice))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {enq.status === "APPROVED" && (
            <ConvertPanel
              enquiryId={id}
              allLinked={allLinked}
              shipDate={enq.requiredShipDate ? enq.requiredShipDate.toISOString().slice(0, 10) : ""}
              items={enq.items.map((it) => ({
                id: it.id,
                label: it.styleId ? `${styleNo.get(it.styleId) ?? ""} ${it.description}`.trim() : it.description,
                quantity: it.quantity,
                targetPrice: it.targetPrice === null ? "" : String(Number(it.targetPrice)),
              }))}
            />
          )}
        </div>
      )}

      {tab === "negotiation" && (
        <div className="space-y-4">
          {open && <NegotiationForm enquiryId={id} />}
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Our quote</TableHead>
                  <TableHead>Buyer target</TableHead>
                  <TableHead>Revised price</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enq.negotiations.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No negotiation rounds yet
                    </TableCell>
                  </TableRow>
                ) : (
                  enq.negotiations.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{day(n.negotiatedAt)}</TableCell>
                      <TableCell>{price(n.initialQuotedPrice)}</TableCell>
                      <TableCell>{price(n.buyerTarget)}</TableCell>
                      <TableCell>{price(n.revisedPrice)}</TableCell>
                      <TableCell>{n.reason ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </DetailPage>
  );
}