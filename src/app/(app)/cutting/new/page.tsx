import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { materialService } from "@/services/material.service";
import { productionOrderService } from "@/services/production-order.service";
import { styleService } from "@/services/style.service";
import { CutPlanForm } from "./cut-plan-form";

const ELIGIBLE = ["RELEASED", "IN_PROGRESS"];

export default async function NewCutPlanPage(props: { searchParams: Promise<{ productionOrderId?: string }> }) {
  const { productionOrderId } = await props.searchParams;

  if (!productionOrderId) {
    const pos = (await productionOrderService.list().catch(() => [])).filter((p) => ELIGIBLE.includes(p.status));
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New cut plan" description="Pick a released production order first" />
        <Card>
          <CardContent className="divide-y p-0">
            {pos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No released production orders are waiting for a cut plan.</p>
            ) : (
              pos.map((p) => (
                <Link
                  key={p.id}
                  href={`/cutting/new?productionOrderId=${p.id}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium text-denim-700">{p.productionNo}</span>
                  <span className="text-muted-foreground">
                    {p.style.styleNo} - {p.quantity} pcs
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const po = await productionOrderService.get(productionOrderId).catch(() => null);
  if (!po) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New cut plan" />
        <p className="text-sm text-destructive">Production order not found.</p>
      </div>
    );
  }
  if (!ELIGIBLE.includes(po.status)) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title="New cut plan" />
        <p className="text-sm text-destructive">
          {po.productionNo} is {po.status.replace(/_/g, " ").toLowerCase()}. Release it first.
        </p>
      </div>
    );
  }

  const [style, materials] = await Promise.all([
    styleService.get(po.styleId),
    materialService.list({ activeOnly: true }).catch(() => []),
  ]);
  if (!style) {
    return <p className="text-sm text-destructive">Style not found.</p>;
  }

  const allowed = Math.floor(po.quantity * (1 + Number(po.allowancePct) / 100));

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="New cut plan"
        description={`${po.productionNo}: ${style.styleNo}, ${po.quantity} pcs (max ${allowed} with allowance)`}
      />
      <CutPlanForm
        productionOrderId={po.id}
        colors={style.colors.map((c) => c.name)}
        sizes={style.sizes.map((s) => s.label)}
        materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name}` }))}
      />
    </div>
  );
}