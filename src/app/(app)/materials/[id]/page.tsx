import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { materialService } from "@/services/material.service";
import { ActiveToggle } from "./active-toggle";

const TABS: DetailTab[] = [{ key: "overview", label: "Overview" }];

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

export default async function MaterialDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const material = await materialService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });

  return (
    <DetailPage
      code={material.code}
      title={material.name}
      status={material.status}
      basePath={`/materials/${id}`}
      tabs={TABS}
      activeTab="overview"
      actions={
        <div className="flex items-start gap-2">
          <Link href={`/materials/${id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Edit
          </Link>
          <ActiveToggle id={id} active={material.status === "ACTIVE"} />
        </div>
      }
      side={
        <SidePanelSection title="Next action">
          <p className="text-muted-foreground">Use this material in a BOM or a purchase requisition.</p>
        </SidePanelSection>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Material details</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Category" value={`${material.category.code} - ${material.category.name}`} />
          <Row label="Unit" value={material.unit} />
          <Row label="Reorder point" value={material.reorderPoint ? String(material.reorderPoint) : null} />
          <Row label="Description" value={material.description} />
        </CardContent>
      </Card>
    </DetailPage>
  );
}