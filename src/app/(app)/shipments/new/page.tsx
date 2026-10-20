import { PageHeader } from "@/components/layout/page-header";
import { shipmentService } from "@/services/shipment.service";
import { ShipmentForm } from "./shipment-form";

export default async function NewShipmentPage() {
  const opts = await shipmentService.formOptions();

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New shipment" description="You add the cartons after the shipment is created" />
      <ShipmentForm factories={opts.factories} buyers={opts.buyers} forwarders={opts.forwarders} />
    </div>
  );
}