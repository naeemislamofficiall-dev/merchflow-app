import { PageHeader } from "@/components/layout/page-header";
import { buyerService } from "@/services/buyer.service";
import { styleService } from "@/services/style.service";
import { EnquiryForm } from "./enquiry-form";

export default async function NewEnquiryPage() {
  const [buyers, styles] = await Promise.all([
    buyerService.list(true).catch(() => []),
    styleService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="New enquiry"
        description="Record what the buyer asked for. Link a style to each item if you plan to turn this into an order."
      />
      <EnquiryForm
        buyers={buyers.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}`, currency: b.currency }))}
        styles={styles
          .filter((s) => s.status !== "ARCHIVED")
          .map((s) => ({
            id: s.id,
            buyerId: s.buyerId,
            name: s.name,
            label: `${s.styleNo} - ${s.name} (${s.status.toLowerCase()})`,
          }))}
      />
    </div>
  );
}