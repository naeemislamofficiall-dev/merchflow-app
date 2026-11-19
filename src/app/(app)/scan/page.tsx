import { PageBand } from "@/components/approvals/ui";
import { ScanArt } from "@/components/inventory/scan-art";
import { requirePermission } from "@/lib/permissions";
import { Scanner } from "./scanner";

export default async function ScanPage() {
  await requirePermission("scan.use");
  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-card">
            <ScanArt className="h-9 w-9" />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Scan</h1>
            <p className="text-sm text-slate-500">
              Scan a barcode or QR label, or type a roll number, to jump straight to the record
            </p>
          </div>
        </header>
      </PageBand>
      <Scanner />
    </div>
  );
}