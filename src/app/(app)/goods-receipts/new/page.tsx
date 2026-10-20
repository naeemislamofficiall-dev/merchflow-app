import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { poService } from "@/services/po.service";
import { warehouseService } from "@/services/warehouse.service";
import { GrnForm } from "./grn-form";

const RECEIVABLE = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"];

export default async function NewGrnPage(props: { searchParams: Promise<{ poId?: string }> }) {
  const { poId } = await props.searchParams;

  if (!poId) {
    const pos = (await poService.list().catch(() => [])).filter((p) => RECEIVABLE.includes(p.status));
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New goods receipt" description="Pick the purchase order the goods came against" />
        <Card>
          <CardContent className="divide-y p-0">
            {pos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No purchase orders are waiting for goods.</p>
            ) : (
              pos.map((p) => (
                <Link
                  key={p.id}
                  href={`/goods-receipts/new?poId=${p.id}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium text-denim-700">{p.poNo}</span>
                  <span className="text-muted-foreground">{p.supplier.name}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const po = await poService.get(poId).catch(() => null);
  if (!po) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New goods receipt" />
        <p className="text-sm text-destructive">PO not found.</p>
      </div>
    );
  }
  if (!RECEIVABLE.includes(po.status)) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New goods receipt" />
        <p className="text-sm text-destructive">
          {po.poNo} is {po.status.replace(/_/g, " ").toLowerCase()}. Goods can be received only after the PO is sent.
        </p>
      </div>
    );
  }

  const warehouses = await warehouseService.listAll().catch(() => []);

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="New goods receipt" description={`Against ${po.poNo} (${po.supplier.name})`} />
      <GrnForm
        poId={po.id}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          label: `${w.code} - ${w.name}`,
          bins: w.bins.map((b) => ({ id: b.id, code: b.code })),
        }))}
        lines={po.lines.map((l) => ({
          id: l.id,
          material: `${l.material.code} - ${l.material.name}`,
          unit: l.unit,
          ordered: Number(l.quantity),
          received: Number(l.receivedQty),
        }))}
      />
    </div>
  );
}