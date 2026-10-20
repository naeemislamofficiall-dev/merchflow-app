import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prService } from "@/services/pr.service";
import { supplierService } from "@/services/supplier.service";
import { PoForm } from "./po-form";

export default async function NewPoPage(props: { searchParams: Promise<{ prId?: string }> }) {
  const { prId } = await props.searchParams;

  // PR বাছা না থাকলে Approved PR-এর তালিকা দেখাই
  if (!prId) {
    const prs = await prService.list({ status: "APPROVED" }).catch(() => []);
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New purchase order" description="Pick an approved purchase requisition first" />
        <Card>
          <CardContent className="divide-y p-0">
            {prs.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No approved PRs are waiting for a PO.</p>
            ) : (
              prs.map((p) => (
                <Link
                  key={p.id}
                  href={`/purchase-orders/new?prId=${p.id}`}
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

  const pr = await prService.get(prId).catch(() => null);
  if (!pr) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New purchase order" />
        <p className="text-sm text-destructive">PR not found.</p>
      </div>
    );
  }
  if (pr.status !== "APPROVED") {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New purchase order" />
        <p className="text-sm text-destructive">
          {pr.prNo} is {pr.status.replace(/_/g, " ").toLowerCase()}. Only approved PRs can become a PO.
        </p>
      </div>
    );
  }

  const suppliers = await supplierService.list({ activeOnly: true }).catch(() => []);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="New purchase order" description={`From ${pr.prNo}`} />
      <PoForm
        prId={pr.id}
        suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
        lines={pr.lines.map((l) => ({
          id: l.id,
          material: `${l.material.code} - ${l.material.name}`,
          quantity: Number(l.quantity),
          unit: l.unit,
        }))}
      />
    </div>
  );
}
