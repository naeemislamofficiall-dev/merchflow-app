import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="space-y-4">
      <PageHeader
        title="Material issues"
        description="Material sent from the store to production, cutting or subcontract"
        actions={
          <Link href="/material-issues/new" className={buttonVariants()}>
            Issue material
          </Link>
        }
      />
      <IssuesTable rows={rows} />
    </div>
  );
}