import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { enquiryService } from "@/services/enquiry.service";
import { EnquiriesTable, type EnquiryRow } from "./enquiries-table";

const money = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export default async function EnquiriesPage() {
  const enquiries = await enquiryService.list();

  const rows: EnquiryRow[] = enquiries.map((e) => {
    const priced = e.items.filter((i) => i.targetPrice !== null);
    const value = priced.reduce((s, i) => s + i.quantity * Number(i.targetPrice), 0);
    return {
      id: e.id,
      enquiryNo: e.enquiryNo,
      buyer: e.buyer.name,
      items: e.items.length,
      units: e.items.reduce((s, i) => s + i.quantity, 0),
      requiredShipDate: e.requiredShipDate ? e.requiredShipDate.toISOString().slice(0, 10) : "",
      value: priced.length > 0 ? `${e.currency} ${money(value)}` : "-",
      status: e.status,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enquiries"
        description="Buyer enquiries from first request to a confirmed order"
        actions={
          <Link href="/enquiries/new" className={buttonVariants()}>
            New enquiry
          </Link>
        }
      />
      <EnquiriesTable rows={rows} />
    </div>
  );
}