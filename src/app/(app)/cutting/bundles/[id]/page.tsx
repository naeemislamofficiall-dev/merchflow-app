import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { resolveScope } from "@/lib/scope";

export default async function BundleDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requirePermission("cutting.view");

  const bundle = await prisma.bundle.findUnique({
    where: { id },
    include: {
      productionOrder: { select: { id: true, productionNo: true, factoryId: true } },
      lay: { select: { layNo: true } },
    },
  });
  if (!bundle || bundle.companyId !== user.companyId) notFound();
  const scope = await resolveScope(user.id);
  if (!scope.factoryIds.includes(bundle.productionOrder.factoryId)) notFound();

  const rows: [string, string][] = [
    ["Color", bundle.color],
    ["Size", bundle.size],
    ["Quantity", String(bundle.quantity)],
    ["Cut number", bundle.cutNumber],
    ["Lay", `#${bundle.lay.layNo}`],
    ["Created", bundle.createdAt.toISOString().slice(0, 10)],
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={`Bundle ${bundle.bundleNo}`} description="Cutting bundle details" />
      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Production order</p>
            <Link
              href={`/production-orders/${bundle.productionOrder.id}`}
              className="text-sm font-medium text-denim-700 hover:underline"
            >
              {bundle.productionOrder.productionNo}
            </Link>
          </div>
          {rows.map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}