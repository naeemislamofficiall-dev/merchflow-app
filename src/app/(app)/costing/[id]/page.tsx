import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { costingService } from "@/services/costing.service";
import { categoryLabel } from "../categories";
import { ItemsEditor } from "./items-editor";
import { PricingPanel } from "./pricing-panel";
import { SheetActions } from "./sheet-actions";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export default async function CostSheetPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const sheet = await costingService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!sheet) notFound();

  const versions = await costingService.listForStyle(sheet.styleId);
  const isPost = sheet.costType === "POST";
  const editable = sheet.status === "DRAFT" || sheet.status === "REJECTED";

  const total = Number(sheet.totalCost);
  const quoted = Number(sheet.quotedPrice);

  const tabs: DetailTab[] = [{ key: "overview", label: "Overview" }];
  if (isPost) tabs.push({ key: "variance", label: "Estimate vs actual" });

  const variance = isPost && tab === "variance" ? await costingService.variance(id).catch(() => null) : null;

  return (
    <DetailPage
      code={`${sheet.style.styleNo} - ${isPost ? "Post costing" : "Estimate"}`}
      title={`Costing v${sheet.version}`}
      status={sheet.status}
      basePath={`/costing/${id}`}
      tabs={tabs}
      activeTab={tab}
      actions={<SheetActions sheetId={id} status={sheet.status} />}
      kpis={[
        { label: "Total cost", value: `${sheet.currency} ${fmt(total)}` },
        { label: "Margin", value: `${Number(sheet.marginPct)}%` },
        { label: "Quoted price", value: `${sheet.currency} ${fmt(quoted)}`, tone: "good" },
        { label: "Cost items", value: sheet.items.length },
        { label: "Version", value: `v${sheet.version}` },
      ]}
      side={
        <>
          <SidePanelSection title="Style">
            <Link href={`/styles/${sheet.styleId}`} className="text-denim-700 hover:underline">
              {sheet.style.styleNo} - {sheet.style.name}
            </Link>
          </SidePanelSection>
          <SidePanelSection title="Versions">
            {versions.map((v) => (
              <div key={v.id} className="flex justify-between gap-2">
                {v.id === id ? (
                  <span className="font-medium">v{v.version} (this)</span>
                ) : (
                  <Link href={`/costing/${v.id}`} className="text-denim-700 hover:underline">
                    v{v.version}
                  </Link>
                )}
                <span className="text-muted-foreground">{v.status.toLowerCase()}</span>
              </div>
            ))}
          </SidePanelSection>
          {isPost && (
            <SidePanelSection title="Linked">
              {sheet.sourceCostSheetId && (
                <Link href={`/costing/${sheet.sourceCostSheetId}`} className="block text-denim-700 hover:underline">
                  Open the estimate
                </Link>
              )}
              {sheet.orderId && (
                <Link href={`/orders/${sheet.orderId}`} className="block text-denim-700 hover:underline">
                  Open the order
                </Link>
              )}
            </SidePanelSection>
          )}
          <SidePanelSection title="Exchange rate">
            <p className="text-muted-foreground">
              {sheet.exchangeRate
                ? `1 ${sheet.currency} = ${Number(sheet.exchangeRate)} ${sheet.baseCurrency ?? ""} (${sheet.baseCurrency ?? ""} ${fmt(Number(sheet.baseQuotedPrice ?? 0))})`
                : "Not recorded"}
            </p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {sheet.status === "DRAFT" && "Add all cost items, set the margin, then submit for approval."}
              {sheet.status === "SUBMITTED" && "Waiting for approval or rejection."}
              {sheet.status === "REJECTED" && "Reopen the sheet, correct it and submit again."}
              {sheet.status === "APPROVED" && "Locked. Create a new version to change anything."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <div className="space-y-4">
          <ItemsEditor
            sheetId={id}
            editable={editable}
            items={sheet.items.map((i) => ({
              id: i.id,
              category: i.category,
              description: i.description,
              unit: i.unit,
              consumption: String(Number(i.consumption)),
              unitPrice: String(Number(i.unitPrice)),
              wastagePct: String(Number(i.wastagePct)),
              amount: Number(i.amount),
            }))}
          />
          <PricingPanel
            sheetId={id}
            editable={editable}
            currency={sheet.currency}
            marginPct={Number(sheet.marginPct)}
            totalCost={total}
            quotedPrice={quoted}
          />
        </div>
      )}

      {tab === "variance" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead>Estimated</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!variance ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Comparison is not available for this sheet
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {variance.rows.map((r) => (
                    <TableRow key={r.category}>
                      <TableCell>{categoryLabel(r.category)}</TableCell>
                      <TableCell>{fmt(r.estimated)}</TableCell>
                      <TableCell>{fmt(r.actual)}</TableCell>
                      <TableCell className={r.variance > 0 ? "text-destructive" : "text-emerald-700"}>
                        {r.variance > 0 ? "+" : ""}
                        {fmt(r.variance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold hover:bg-transparent">
                    <TableCell>Total</TableCell>
                    <TableCell>{fmt(variance.total.estimated)}</TableCell>
                    <TableCell>{fmt(variance.total.actual)}</TableCell>
                    <TableCell className={variance.total.variance > 0 ? "text-destructive" : "text-emerald-700"}>
                      {variance.total.variance > 0 ? "+" : ""}
                      {fmt(variance.total.variance)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </DetailPage>
  );
}