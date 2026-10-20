import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { sampleService } from "@/services/sample.service";
import { SamplesTable, type SampleRow } from "./samples-table";

const typeLabel = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default async function SamplesPage() {
  const samples = await sampleService.list();

  const rows: SampleRow[] = samples.map((s) => ({
    id: s.id,
    sampleNo: s.sampleNo,
    style: `${s.style.styleNo} - ${s.style.name}`,
    type: typeLabel(s.sampleType),
    quantity: s.quantity,
    dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "",
    revisions: s.revisionCount,
    status: s.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Samples"
        description="Sample requests from development to buyer approval"
        actions={
          <Link href="/samples/new" className={buttonVariants()}>
            New sample
          </Link>
        }
      />
      <SamplesTable rows={rows} />
    </div>
  );
}