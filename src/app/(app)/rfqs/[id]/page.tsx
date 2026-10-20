import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { rfqService } from "@/services/rfq.service";
import { supplierService } from "@/services/supplier.service";
import { RfqActions } from "./rfq-actions";
import { RfqSuppliers } from "./rfq-suppliers";

const TABS: DetailTab[] = [{ key: "overview", label: "Lines and suppliers" }];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "-");
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

const NEXT: Record<string, string> = {
  DRAFT: "Add the suppliers, then send the RFQ.",
  SENT: "Record the quotes you receive in Quotations. Close the RFQ when you are done.",
  CLOSED: "This RFQ is closed.",
  CANCELLED: "This RFQ was cancelled.",
};

export default async function RfqDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const rfq = await rfqService.get(id).catch(() => null);
  if (!rfq) notFound();

  const allSuppliers = await supplierService.list({ activeOnly: true }).catch(() => []);
  const taken = new Set(rfq.suppliers.map((s) => s.supplierId));
  const editable = rfq.status === "DRAFT";

  return (
    <DetailPage
      code={rfq.notes ?? "RFQ"}
      title={rfq.rfqNo}
      status={rfq.status}
      basePath={`/rfqs/${id}`}
      tabs={TABS}
      activeTab="overview"
      actions={<RfqActions rfqId={id} status={rfq.status} />}
      kpis={[
        { label: "Lines", value: rfq.lines.length },
        { label: "Suppliers", value: rfq.suppliers.length },
        { label: "Quotations", value: rfq.quotations.length },
        { label: "Reply due", value: day(rfq.dueDate) },
      ]}
      side={
        <>
          {rfq.prId && (
            <SidePanelSection title="Related records">
              <Link href={`/prs/${rfq.prId}`} className="block text-denim-700 hover:underline">
                View purchase requisition
              </Link>
              <Link href={`/quotations?rfqId=${id}`} className="block text-denim-700 hover:underline">
                View quotations of this RFQ
              </Link>
            </SidePanelSection>
          )}
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[rfq.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Material</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.material.name}</p>
                      <p className="text-xs text-muted-foreground">{l.material.code}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(Number(l.quantity))} {l.unit}
                    </TableCell>
                    <TableCell>{day(l.requiredDate)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/quotations?materialId=${l.materialId}&rfqId=${id}`}
                        className="text-sm text-denim-700 hover:underline"
                      >
                        Compare quotes
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <RfqSuppliers
          rfqId={id}
          editable={editable}
          current={rfq.suppliers.map((s) => ({
            supplierId: s.supplierId,
            name: s.supplier.name,
            sentAt: s.sentAt ? s.sentAt.toISOString().slice(0, 10) : "",
          }))}
          available={allSuppliers.filter((s) => !taken.has(s.id)).map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` }))}
        />
      </div>
    </DetailPage>
  );
}