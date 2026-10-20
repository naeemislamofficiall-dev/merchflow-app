import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { bomService } from "@/services/bom.service";
import { materialService } from "@/services/material.service";
import { supplierService } from "@/services/supplier.service";
import { BomActions } from "./bom-actions";
import { ItemForm } from "./item-form";
import { RemoveItemButton } from "./remove-item-button";

const TABS: DetailTab[] = [{ key: "items", label: "Items" }];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

export default async function BomDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const bom = await bomService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });

  const editable = bom.status === "DRAFT";

  // item-form-এর তালিকা। permission না থাকলে ফাঁকা তালিকা, পেজ ভাঙে না।
  const [materials, suppliers] = editable
    ? await Promise.all([
        materialService.list({ activeOnly: true }).catch(() => []),
        supplierService.list({ activeOnly: true }).catch(() => []),
      ])
    : [[], []];

  return (
    <DetailPage
      code={`${bom.style.styleNo} · v${bom.version}`}
      title={`BOM - ${bom.style.name}`}
      status={bom.status}
      basePath={`/bom/${id}`}
      tabs={TABS}
      activeTab="items"
      actions={<BomActions bomId={id} status={bom.status} itemCount={bom.items.length} />}
      kpis={[
        { label: "Items", value: bom.items.length },
        { label: "Version", value: `v${bom.version}` },
        { label: "Without supplier", value: bom.items.filter((i) => !i.supplierId).length },
      ]}
      side={
        <>
          <SidePanelSection title="Rules">
            <p className="text-muted-foreground">
              {editable
                ? "Add at least one item, then approve. An approved BOM cannot be edited."
                : "This BOM is locked. Use New revision to change it."}
            </p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {editable ? "Add items and approve the BOM." : "Run material requirements (MRP) from this BOM."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>BOM items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Consumption</TableHead>
                  <TableHead>Wastage</TableHead>
                  <TableHead>Required / piece</TableHead>
                  <TableHead>Rate</TableHead>
                  {editable && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.items.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={editable ? 8 : 7} className="h-20 text-center text-muted-foreground">
                      No items yet
                    </TableCell>
                  </TableRow>
                ) : (
                  bom.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="capitalize">{i.itemType.toLowerCase()}</TableCell>
                      <TableCell>
                        <p className="font-medium">{i.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[i.material?.code, i.subCategory].filter(Boolean).join(" · ")}
                        </p>
                      </TableCell>
                      <TableCell>{i.supplier?.name ?? "-"}</TableCell>
                      <TableCell>
                        {fmt(Number(i.consumption))} {i.unit}
                      </TableCell>
                      <TableCell>{fmt(Number(i.wastagePct))}%</TableCell>
                      <TableCell>
                        {fmt(i.requiredPerUnit)} {i.unit}
                      </TableCell>
                      <TableCell>{i.rate ? `${i.currency ?? ""} ${fmt(Number(i.rate))}` : "-"}</TableCell>
                      {editable && (
                        <TableCell>
                          <RemoveItemButton itemId={i.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {editable && (
          <ItemForm
            bomId={id}
            materials={materials.map((m) => ({ id: m.id, label: `${m.code} - ${m.name}`, name: m.name, unit: m.unit }))}
            suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
          />
        )}
      </div>
    </DetailPage>
  );
}