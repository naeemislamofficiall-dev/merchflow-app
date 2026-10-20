import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { cuttingService } from "@/services/cutting.service";
import { materialService } from "@/services/material.service";
import { CutPlanActions } from "./cut-plan-actions";
import { LaySection, type LayItem } from "./lay-section";

const TABS: DetailTab[] = [{ key: "lays", label: "Lays and bundles" }];

const NEXT: Record<string, string> = {
  PLANNED: "Reserve the fabric, then add lays.",
  FABRIC_RESERVED: "Add lays and mark them cut.",
  CUTTING: "Keep cutting. The plan completes when every lay is cut.",
  COMPLETED: "All lays are cut. Make bundles for each lay.",
  CANCELLED: "This cut plan was cancelled.",
};

export default async function CutPlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const plan = await cuttingService.plan(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!plan) notFound();

  const [bundles, materials] = await Promise.all([
    cuttingService.bundles({ cutPlanId: id }),
    materialService.list().catch(() => []),
  ]);
  const material = materials.find((m) => m.id === plan.materialId);
  const ratio = (plan.sizeRatio ?? {}) as Record<string, number>;
  const withBundles = new Set(bundles.map((b) => b.layId));

  const lays: LayItem[] = plan.lays.map((l) => ({
    id: l.id,
    layNo: l.layNo,
    plies: l.plies,
    actualPlies: l.actualPlies,
    status: l.status,
    markerLength: l.markerLength ? String(Number(l.markerLength)) : "",
    fabricUsed: l.fabricUsed ? String(Number(l.fabricUsed)) : "",
    hasBundles: withBundles.has(l.id),
  }));

  const pliesCut = plan.lays
    .filter((l) => l.status === "CUT")
    .reduce((s, l) => s + (l.actualPlies ?? l.plies), 0);

  return (
    <DetailPage
      code={`${plan.productionOrder.productionNo} - ${plan.color}`}
      title={plan.cutPlanNo}
      status={plan.status}
      basePath={`/cutting/${id}`}
      tabs={TABS}
      activeTab="lays"
      actions={<CutPlanActions planId={id} status={plan.status} />}
      kpis={[
        { label: "Planned plies", value: plan.plannedPlies },
        { label: "Plies cut", value: pliesCut },
        { label: "Planned output", value: `${plan.plannedOutput} pcs` },
        { label: "Fabric needed", value: Number(plan.fabricRequirement).toFixed(2) },
        { label: "Bundles", value: bundles.length },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/production-orders/${plan.productionOrderId}`} className="block text-denim-700 hover:underline">
              Production {plan.productionOrder.productionNo}
            </Link>
            <p className="text-muted-foreground">Fabric: {material ? `${material.code} - ${material.name}` : "-"}</p>
          </SidePanelSection>
          <SidePanelSection title="Size ratio">
            <p className="text-muted-foreground">
              {Object.entries(ratio)
                .map(([s, n]) => `${s}: ${n}`)
                .join(", ") || "-"}
            </p>
          </SidePanelSection>
          {plan.cancelReason && (
            <SidePanelSection title="Cancel reason">
              <p className="text-muted-foreground">{plan.cancelReason}</p>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[plan.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <LaySection planId={id} planStatus={plan.status} lays={lays} />

        <Card>
          <CardHeader>
            <CardTitle>Bundles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Bundle</TableHead>
                  <TableHead>Cut number</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Pieces</TableHead>
                  <TableHead>Barcode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      No bundles yet. Cut a lay, then use Make bundles.
                    </TableCell>
                  </TableRow>
                ) : (
                  bundles.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.bundleNo}</TableCell>
                      <TableCell>{b.cutNumber}</TableCell>
                      <TableCell>{b.color}</TableCell>
                      <TableCell>{b.size}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DetailPage>
  );
}