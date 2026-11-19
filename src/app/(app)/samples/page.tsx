import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import { sampleService } from "@/services/sample.service";
import { PageBand } from "@/components/approvals/ui";
import { SamplesTable, type SampleRow } from "./samples-table";

const typeLabel = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default async function SamplesPage() {
  const samples = await sampleService.list();

  const rows: SampleRow[] = samples.map((s) => ({
    id: s.id,
    sampleNo: s.sampleNo,
    styleNo: s.style.styleNo,
    styleName: s.style.name,
    type: typeLabel(s.sampleType),
    quantity: s.quantity,
    requestedOn: s.createdAt.toISOString().slice(0, 10),
    dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "",
    status: s.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Shirt className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Samples</h1>
              <p className="text-sm text-navy-800">Sample requests from development to buyer approval</p>
            </div>
          </div>
          <Link
            href="/samples/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Sample Request
          </Link>
        </header>
      </PageBand>

      <SamplesTable rows={rows} />
    </div>
  );
}