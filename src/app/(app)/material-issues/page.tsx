import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { materialIssueService } from "@/services/material-issue.service";
import { IssuesTable, type IssueRow } from "./issues-table";

export default async function MaterialIssuesPage() {
  const issues = await materialIssueService.list();

  const rows: IssueRow[] = issues.map((i) => ({
    id: i.id,
    issueNo: i.issueNo,
    target: i.targetType.replace(/_/g, " ").toLowerCase(),
    referenceNo: i.referenceNo ?? "",
    lines: i.lines.length,
    issuedAt: i.issuedAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Box className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Material issues</h1>
              <p className="text-sm text-slate-500">
                Material sent from the store to production, cutting or subcontract
              </p>
            </div>
          </div>
          <Link
            href="/material-issues/new"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Issue material
          </Link>
        </header>
      </PageBand>

      <IssuesTable rows={rows} />
    </div>
  );
}