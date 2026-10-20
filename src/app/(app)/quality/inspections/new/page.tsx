import { PageHeader } from "@/components/layout/page-header";
import { qualityService } from "@/services/quality.service";
import { InspectionForm } from "./inspection-form";

export default async function NewInspectionPage() {
  const opts = await qualityService.formOptions();

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New inspection" description="Record what you checked and the defects you found" />
      <InspectionForm
        factories={opts.factories}
        lines={opts.lines}
        orders={opts.orders}
        defects={opts.defects}
      />
    </div>
  );
}