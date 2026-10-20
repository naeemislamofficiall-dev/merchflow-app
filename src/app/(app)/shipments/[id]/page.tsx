import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { shipmentService } from "@/services/shipment.service";
import { ShipmentActions } from "./shipment-actions";
import { ShipmentSections } from "./shipment-sections";

const TABS: DetailTab[] = [{ key: "cargo", label: "Cartons and containers" }];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");

const NEXT: Record<string, string> = {
  DRAFT: "Add cartons, then mark the shipment as planned.",
  PLANNED: "Prepare the export documents, then mark them ready.",
  DOCUMENTS_READY: "Book the shipment. A failed final AQL inspection blocks this.",
  BOOKED: "Ship it when the goods leave.",
  SHIPPED: "Mark delivered when the buyer receives the goods.",
  DELIVERED: "Close the shipment.",
  CLOSED: "This shipment is closed.",
  CANCELLED: "This shipment was cancelled.",
};

const CARTON_EDITABLE = ["DRAFT", "PLANNED", "DOCUMENTS_READY"];
const LOCKED = ["SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"];

export default async function ShipmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const s = await shipmentService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!s) notFound();

  const cartonsEditable = CARTON_EDITABLE.includes(s.status);
  const [cartons, available, readiness] = await Promise.all([
    shipmentService.cartonsOf(id),
    cartonsEditable ? shipmentService.availableCartons(id) : Promise.resolve([]),
    shipmentService.readiness(id).catch(() => null),
  ]);
  const blocked = readiness?.inspection.filter((g) => g.blocked) ?? [];

  return (
    <DetailPage
      code={s.mode.toLowerCase()}
      title={s.shipmentNo}
      status={s.status}
      basePath={`/shipments/${id}`}
      tabs={TABS}
      activeTab="cargo"
      actions={<ShipmentActions shipmentId={id} status={s.status} />}
      kpis={[
        { label: "Cartons", value: cartons.length },
        { label: "Pieces", value: s.qty },
        { label: "Containers", value: s.containers.length },
        { label: "Planned ship", value: day(s.plannedShipDate) },
      ]}
      side={
        <>
          <SidePanelSection title="Transport">
            <p className="text-muted-foreground">Forwarder: {s.forwarder?.name ?? "-"}</p>
            <p className="text-muted-foreground">Port: {s.port ?? "-"}</p>
            <p className="text-muted-foreground">Destination: {s.destination ?? "-"}</p>
            <p className="text-muted-foreground">Vessel or flight: {s.vesselOrFlight ?? "-"}</p>
            <p className="text-muted-foreground">BL no: {s.blNo ?? "-"}</p>
            <p className="text-muted-foreground">Invoice no: {s.invoiceNo ?? "-"}</p>
          </SidePanelSection>
          {s.orderIds.length > 0 && (
            <SidePanelSection title="Orders in this shipment">
              {s.orderIds.map((oid) => (
                <Link key={oid} href={`/orders/${oid}`} className="block text-denim-700 hover:underline">
                  View order
                </Link>
              ))}
            </SidePanelSection>
          )}
          {blocked.length > 0 && (
            <SidePanelSection title="Blocked by final inspection">
              <p className="text-destructive">
                {blocked.length} order(s) have a final AQL inspection that did not pass. Book and ship stay blocked until
                it passes or someone with permission overrides it.
              </p>
            </SidePanelSection>
          )}
          {readiness && readiness.warnings.length > 0 && (
            <SidePanelSection title="Warnings">
              {readiness.warnings.map((w) => (
                <p key={w} className="text-muted-foreground">
                  {w}
                </p>
              ))}
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[s.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <ShipmentSections
        shipmentId={id}
        cartonsEditable={cartonsEditable}
        containersEditable={!LOCKED.includes(s.status)}
        cartons={cartons}
        available={available}
        containers={s.containers.map((c) => ({
          id: c.id,
          containerNo: c.containerNo,
          containerType: c.containerType ?? "",
          sealNo: c.sealNo ?? "",
        }))}
      />
    </DetailPage>
  );
}