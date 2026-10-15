import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { buyerService } from "@/services/buyer.service";
import { BuyersTable, type BuyerRow } from "./buyers-table";

export default async function BuyersPage() {
  const buyers = await buyerService.list();

  // client-এ পাঠানোর আগে সাধারণ মানে (string/number) রূপান্তর
  const rows: BuyerRow[] = buyers.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    country: b.country ?? "",
    currency: b.currency,
    paymentTerms: b.paymentTerms ?? "",
    status: b.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Buyers"
        description="All buyers of your company"
        actions={
          <Link href="/buyers/new" className={buttonVariants()}>
            New buyer
          </Link>
        }
      />
      <BuyersTable rows={rows} />
    </div>
  );
}