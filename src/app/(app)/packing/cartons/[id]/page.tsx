import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { packingService } from "@/services/packing.service";
import { CartonPanel } from "./carton-panel";

const TABS: DetailTab[] = [{ key: "contents", label: "Contents" }];

const n = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

const NEXT: Record<string, string> = {
  OPEN: "Enter weight and size, then close the carton.",
  CLOSED: "Ready. Add it to a shipment.",
  SHIPPED: "This carton has been shipped.",
};

export default async function CartonDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const c = await packingService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!c) notFound();

  // style/color/size-এর নাম আর QR এই মেথড থেকে আসে (scan.use অনুমতি লাগে)
  const label = await packingService.label(c.cartonNo).catch(() => null);
  const pieces = c.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <DetailPage
      code={c.packType.toLowerCase()}
      title={c.cartonNo}
      status={c.status}
      basePath={`/packing/cartons/${id}`}
      tabs={TABS}
      activeTab="contents"
      kpis={[
        { label: "Pieces", value: pieces },
        { label: "Gross (kg)", value: n(c.grossWeightKg) || "-" },
        { label: "Net (kg)", value: n(c.netWeightKg) || "-" },
        {
          label: "Size (cm)",
          value: c.lengthCm ? `${n(c.lengthCm)} x ${n(c.widthCm)} x ${n(c.heightCm)}` : "-",
        },
      ]}
      side={
        <>
          <SidePanelSection title="Related records">
            <Link href={`/orders/${c.orderId}`} className="block text-denim-700 hover:underline">
              View order
            </Link>
          </SidePanelSection>
          <SidePanelSection title="Barcode">
            <p className="font-mono text-xs text-muted-foreground">{c.barcode}</p>
            {label && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={label.qrDataUrl} alt={`QR of ${c.cartonNo}`} width={120} height={120} className="mt-2" />
            )}
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">{NEXT[c.status] ?? ""}</p>
          </SidePanelSection>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Style</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Pieces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {label
                  ? label.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>{l.style ?? "-"}</TableCell>
                        <TableCell>{l.color ?? "-"}</TableCell>
                        <TableCell>{l.size ?? "-"}</TableCell>
                        <TableCell className="text-right">{l.quantity}</TableCell>
                      </TableRow>
                    ))
                  : c.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Names need the scan permission
                        </TableCell>
                        <TableCell className="text-right">{l.quantity}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CartonPanel
          cartonId={id}
          status={c.status}
          initial={{
            grossWeightKg: n(c.grossWeightKg),
            netWeightKg: n(c.netWeightKg),
            lengthCm: n(c.lengthCm),
            widthCm: n(c.widthCm),
            heightCm: n(c.heightCm),
          }}
        />
      </div>
    </DetailPage>
  );
}