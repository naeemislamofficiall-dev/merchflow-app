import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/permissions";
import { Scanner } from "./scanner";

export default async function ScanPage() {
  await requirePermission("scan.use");
  return (
    <div className="space-y-4">
      <PageHeader
        title="Scan"
        description="Scan a barcode or QR label, or type a roll number, to jump straight to the record"
      />
      <Scanner />
    </div>
  );
}