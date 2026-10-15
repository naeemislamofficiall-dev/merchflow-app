import { PageHeader } from "@/components/layout/page-header";
import { buyerService } from "@/services/buyer.service";
import { StyleForm } from "./style-form";

export default async function NewStylePage() {
  // শুধু সক্রিয় buyer দেখানো হয়, কারণ নিষ্ক্রিয় buyer-এ style খোলা যায় না
  const buyers = await buyerService.list(true).catch(() => []);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New style" description="Create the technical record. Colors and sizes come next." />
      <StyleForm buyers={buyers.map((b) => ({ id: b.id, label: `${b.code} - ${b.name}` }))} />
    </div>
  );
}