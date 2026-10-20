import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { tnaService } from "@/services/tna.service";
import { PlanForm } from "./plan-form";

export default async function NewTnaPlanPage() {
  const [templates, styles, orders] = await Promise.all([
    tnaService.listTemplates().catch(() => []),
    styleService.list().catch(() => []),
    orderService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Generate T&A plan"
        description="Pick a template and the ship date. Every milestone date is counted backwards from it."
      />
      {templates.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">You need at least one template first.</p>
          <Link href="/tna/templates" className={buttonVariants()}>
            Create a template
          </Link>
        </div>
      ) : (
        <PlanForm
          templates={templates.map((t) => ({ id: t.id, label: `${t.name} (${t.tasks.length} milestones)` }))}
          styles={styles
            .filter((s) => s.status !== "ARCHIVED")
            .map((s) => ({ id: s.id, label: `${s.styleNo} - ${s.name}` }))}
          orders={orders
            .filter((o) => o.status !== "CANCELLED")
            .map((o) => ({
              id: o.id,
              label: `${o.orderNo} - ${o.buyer.name}`,
              shipDate: o.shipDate ? o.shipDate.toISOString().slice(0, 10) : "",
              styleIds: [...new Set(o.lines.map((l) => l.styleId))],
            }))}
        />
      )}
    </div>
  );
}