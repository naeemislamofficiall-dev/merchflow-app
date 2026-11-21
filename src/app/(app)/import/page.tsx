import { redirect } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { IMPORTERS } from "@/lib/import-schemas";
import { can, requireUser } from "@/lib/permissions";
import { importService } from "@/services/import.service";
import { BatchesTable, type BatchRow } from "./batches-table";
import { UploadForm } from "./upload-form";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function ImportPage() {
  const user = await requireUser();
  if (!can(user, "import.run")) redirect("/dashboard");
  const batches = await importService.listBatches();
  const types = Object.entries(IMPORTERS).map(([key, v]) => ({ key, label: v.label }));

  const rows: BatchRow[] = batches.map((b) => {
    const label = (IMPORTERS as Record<string, { label: string }>)[b.type]?.label ?? b.type;
    return {
      id: b.id,
      type: label.split(" (")[0],
      fileName: b.fileName,
      status: b.status,
      totalRows: b.totalRows,
      okRows: b.okRows,
      errorRows: b.errorRows,
      skippedRows: b.skippedRows,
      uploaded: fmt(b.createdAt),
    };
  });

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <CloudUpload className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Data Import</h1>
            <p className="text-sm text-slate-500">
              Upload, validate, preview errors, confirm. Nothing is imported until you confirm.
            </p>
          </div>
        </header>
      </PageBand>

      <UploadForm types={types} />
      <BatchesTable rows={rows} />
    </div>
  );
}