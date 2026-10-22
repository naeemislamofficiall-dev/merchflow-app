import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/detail/status-badge";
import { BusinessRuleError } from "@/lib/business-rules";
import { stockCountService } from "@/services/stock-count.service";
import { CountSheet } from "./count-sheet";

export default async function StockCountDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const data = await stockCountService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) return null;
    throw e;
  });
  if (!data) notFound();

  const { count } = data;
  return (
    <div className="space-y-4">
      <PageHeader
        title={count.countNo}
        description={`${data.warehouseName} · ${count.createdAt.toISOString().slice(0, 10)}${count.remarks ? ` · ${count.remarks}` : ""}`}
        actions={
          <>
            <StatusBadge status={count.status} />
            <Link href="/stock-counts" className="text-sm text-primary hover:underline">
              All counts
            </Link>
          </>
        }
      />
      <CountSheet
        id={count.id}
        status={count.status}
        lines={data.lines}
        canCount={data.canCount}
        canPost={data.canPost}
        canCreate={data.canCreate}
        canCancel={data.canCancel}
      />
    </div>
  );
}
