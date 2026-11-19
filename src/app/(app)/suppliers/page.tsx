import Link from "next/link";
import { Ban, Plus, Users } from "lucide-react";
import { CheckFillIcon, FinCard, PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { supplierService } from "@/services/supplier.service";
import { SuppliersTable, type SupplierRow } from "./suppliers-table";

export default async function SuppliersPage() {
  const user = await requireUser();
  const suppliers = await supplierService.list();
  const canEdit = can(user, "supplier.edit");

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

  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const inactive = rows.filter((r) => r.status === "INACTIVE").length;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Users className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Suppliers</h1>
              <p className="text-sm text-navy-800">Fabric, trims, packaging and service suppliers</p>
            </div>
          </div>
          <Link
            href="/suppliers/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Supplier
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <FinCard
          theme="violet"
          wave={false}
          art={<Users className="h-8 w-8" strokeWidth={2.4} />}
          label="Total Suppliers"
          value={String(rows.length)}
        />
        <FinCard theme="green" wave={false} art={<CheckFillIcon />} label="Active Suppliers" value={String(active)} />
        <FinCard
          theme="orange"
          wave={false}
          art={<Ban className="h-8 w-8" strokeWidth={2.4} />}
          label="Inactive Suppliers"
          value={String(inactive)}
        />
      </div>

      <SuppliersTable rows={rows} canEdit={canEdit} />
    </div>
  );
}