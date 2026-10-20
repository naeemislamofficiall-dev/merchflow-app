import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { PageHeader } from "@/components/layout/page-header";
import { supplierService } from "@/services/supplier.service";
import { SupplierForm } from "../../supplier-form";

export default async function EditSupplierPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const supplier = await supplierService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!supplier) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title={`Edit ${supplier.name}`} description="Update supplier details" />
      <SupplierForm
        id={id}
        initial={{
          code: supplier.code,
          name: supplier.name,
          category: supplier.category,
          country: supplier.country ?? "",
          currency: supplier.currency ?? "",
          leadTimeDays: supplier.leadTimeDays != null ? String(supplier.leadTimeDays) : "",
          paymentTerms: supplier.paymentTerms ?? "",
          address: supplier.address ?? "",
          bankName: supplier.bankName ?? "",
          bankBranch: supplier.bankBranch ?? "",
          bankAccountName: supplier.bankAccountName ?? "",
          bankAccountNo: supplier.bankAccountNo ?? "",
        }}
      />
    </div>
  );
}
