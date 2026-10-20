import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prService } from "@/services/pr.service";
import { supplierService } from "@/services/supplier.service";
import { RfqForm } from "./rfq-form";

export default async function NewRfqPage(props: { searchParams: Promise<{ prId?: string }> }) {
  const { prId } = await props.searchParams;

  if (!prId) {
    const prs = await prService.list({ status: "APPROVED" }).catch(() => []);
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New RFQ" description="Pick an approved purchase requisition. Its lines become the RFQ lines" />
        <Card>
          <CardContent className="divide-y p-0">
            {prs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No approved PRs are waiting.</p>
            ) : (
              prs.map((p) => (
                <Link
                  key={p.id}
                  href={`/rfqs/new?prId=${p.id}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium text-denim-700">{p.prNo}</span>
                  <span className="text-muted-foreground">{p.lines.length} lines</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [pr, suppliers] = await Promise.all([
    prService.get(prId).catch(() => null),
    supplierService.list({ activeOnly: true }).catch(() => []),
  ]);
  if (!pr) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New RFQ" />
        <p className="text-sm text-destructive">PR not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New RFQ" description={`From ${pr.prNo}, ${pr.lines.length} lines`} />
      <RfqForm prId={pr.id} suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))} />
    </div>
  );
}