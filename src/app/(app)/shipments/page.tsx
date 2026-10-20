import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { shipmentService } from "@/services/shipment.service";
import { ShipmentsTable, type ShipmentRow } from "./shipments-table";

export default async function ShipmentsPage() {
  const list = await shipmentService.list();

  const rows: ShipmentRow[] = list.map((s) => ({
    id: s.id,
    shipmentNo: s.shipmentNo,
    mode: s.mode.toLowerCase(),
    destination: s.destination ?? "",
    forwarder: s.forwarder?.name ?? "",
    cartons: s._count.lines,
    plannedShipDate: s.plannedShipDate.toISOString().slice(0, 10),
    status: s.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shipments"
        description="Plan, book and ship closed cartons to a buyer"
        actions={
          <Link href="/shipments/new" className={buttonVariants()}>
            New shipment
          </Link>
        }
      />
      <ShipmentsTable rows={rows} />
    </div>
  );
}