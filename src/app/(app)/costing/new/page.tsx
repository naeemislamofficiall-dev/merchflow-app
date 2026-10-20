import { PageHeader } from "@/components/layout/page-header";
import { costingService } from "@/services/costing.service";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { SheetForm } from "./sheet-form";

export default async function NewCostSheetPage(props: { searchParams: Promise<{ styleId?: string }> }) {
  const { styleId = "" } = await props.searchParams;

  const [styles, orders, sheets] = await Promise.all([
    styleService.list().catch(() => []),
    orderService.list().catch(() => []),
    costingService.list().catch(() => []),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="New cost sheet"
        description="Create the sheet first. You add the cost items on the next screen."
      />
      <SheetForm
        defaultStyleId={styleId}
        styles={styles
          .filter((s) => s.status !== "ARCHIVED")
          .map((s) => ({ id: s.id, label: `${s.styleNo} - ${s.name}` }))}
        orders={orders
          .filter((o) => o.status !== "CANCELLED")
          .map((o) => ({
            id: o.id,
            label: `${o.orderNo} - ${o.buyer.name}`,
            styleIds: [...new Set(o.lines.map((l) => l.styleId))],
          }))}
        estimates={sheets
          .filter((s) => s.costType === "PRE" && s.status === "APPROVED")
          .map((s) => ({
            id: s.id,
            styleId: s.styleId,
            label: `v${s.version} (${s.currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(s.quotedPrice))})`,
          }))}
      />
    </div>
  );
}