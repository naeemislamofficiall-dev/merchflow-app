import { PageHeader } from "@/components/layout/page-header";
import { SupplierForm } from "../supplier-form";

export default function NewSupplierPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New supplier" description="Add a supplier to your company" />
      <SupplierForm />
    </div>
  );
}