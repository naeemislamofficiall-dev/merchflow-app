import { PageHeader } from "@/components/layout/page-header";
import { BuyerForm } from "./buyer-form";

export default function NewBuyerPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New buyer" description="Add a buyer to your company" />
      <BuyerForm />
    </div>
  );
}