import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { supplierService } from "@/services/supplier.service";
import { SuppliersTable, type SupplierRow } from "./suppliers-table";

export default async function SuppliersPage() {
  const suppliers = await supplierService.list();

  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    category: s.category,
    country: s.country ?? "",
    currency: s.currency,
    leadTimeDays: s.leadTimeDays === null ? "" : String(s.leadTimeDays),
    status: s.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Fabric, trims, packaging and service suppliers"
        actions={
          <Link href="/suppliers/new" className={buttonVariants()}>
            New supplier
          </Link>
        }
      />
      <SuppliersTable rows={rows} />
    </div>
  );
}