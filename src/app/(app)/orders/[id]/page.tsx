import { notFound } from "next/navigation";
import { BusinessRuleError } from "@/lib/business-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailPage, SidePanelSection, type DetailTab } from "@/components/detail/detail-page";
import { StatusBadge } from "@/components/detail/status-badge";
import { orderService } from "@/services/order.service";
import { styleService } from "@/services/style.service";
import { LineMatrix, type LineMatrixData } from "./line-matrix";
import { OrderActions } from "./order-actions";

const TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "matrix", label: "Color / size" },
  { key: "amendments", label: "Amendments" },
];

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || "-"}</span>
    </div>
  );
}

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "overview" } = await props.searchParams;

  const order = await orderService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!order) notFound();

  const units = order.lines.reduce((s, l) => s + l.quantity, 0);
  const value = order.lines.reduce((s, l) => s + l.quantity * Number(l.unitPrice), 0);
  const lineAllocated = (l: (typeof order.lines)[number]) => l.matrix.reduce((s, c) => s + c.quantity, 0);
  const matrixReady = order.lines.filter((l) => lineAllocated(l) === l.quantity && l.matrix.length > 0).length;

  // Color/size ট্যাবে প্রতিটা style-এর রং ও সাইজ লাগে
  let matrixLines: LineMatrixData[] = [];
  if (tab === "matrix") {
    const styleIds = [...new Set(order.lines.map((l) => l.styleId))];
    const styles = await Promise.all(styleIds.map((sid) => styleService.get(sid).catch(() => null)));
    const byId = new Map(styles.filter((s) => s !== null).map((s) => [s.id, s]));
    matrixLines = order.lines.map((l) => {
      const st = byId.get(l.styleId);
      return {
        lineId: l.id,
        styleNo: l.style.styleNo,
        styleName: l.style.name,
        quantity: l.quantity,
        colors: (st?.colors ?? []).map((c) => ({ id: c.id, code: c.code, name: c.name })),
        sizes: (st?.sizes ?? []).map((s) => ({ id: s.id, label: s.label })),
        cells: l.matrix.map((c) => ({ colorId: c.colorId, sizeId: c.sizeId, quantity: c.quantity })),
      };
    });
  }

  const matrixLocked = order.status !== "DRAFT" && order.status !== "CONFIRMED";

  return (
    <DetailPage
      code={order.orderNo}
      title={order.buyer.name}
      status={order.status}
      basePath={`/orders/${id}`}
      tabs={TABS}
      activeTab={tab}
      actions={<OrderActions orderId={id} status={order.status} />}
      kpis={[
        { label: "Lines", value: order.lines.length },
        { label: "Units", value: fmt(units) },
        { label: "Order value", value: `${order.currency} ${fmt(value)}` },
        { label: "Ship date", value: day(order.shipDate) },
        {
          label: "Matrix ready",
          value: `${matrixReady} / ${order.lines.length}`,
          tone: matrixReady === order.lines.length ? "good" : "warn",
        },
      ]}
      side={
        <>
          <SidePanelSection title="Buyer">
            <p>{order.buyer.name}</p>
            <p className="text-muted-foreground">{order.buyer.code}</p>
          </SidePanelSection>
          <SidePanelSection title="Exchange rate">
            <p className="text-muted-foreground">
              {order.exchangeRate
                ? `1 ${order.currency} = ${Number(order.exchangeRate)} ${order.baseCurrency ?? ""}`
                : "Not recorded"}
            </p>
          </SidePanelSection>
          <SidePanelSection title="Next action">
            <p className="text-muted-foreground">
              {order.status === "DRAFT"
                ? matrixReady < order.lines.length
                  ? "Fill the color / size matrix for every line, then confirm."
                  : "Everything is ready. Confirm the order."
                : order.status === "CONFIRMED"
                  ? "Waiting for production to start."
                  : "No action needed."}
            </p>
          </SidePanelSection>
        </>
      }
    >
      {tab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order details</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Buyer PO" value={order.buyerPoNo} />
              <Row label="Order date" value={day(order.orderDate)} />
              <Row label="Ship date" value={day(order.shipDate)} />
              <Row label="Currency" value={order.currency} />
              <Row label="Notes" value={order.notes} />
            </CardContent>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Style</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Ship date</TableHead>
                  <TableHead>Matrix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((l) => {
                  const done = l.matrix.length > 0 && lineAllocated(l) === l.quantity;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <span className="font-medium">{l.style.styleNo}</span>{" "}
                        <span className="text-muted-foreground">{l.style.name}</span>
                      </TableCell>
                      <TableCell>{fmt(l.quantity)}</TableCell>
                      <TableCell>{fmt(Number(l.unitPrice))}</TableCell>
                      <TableCell>{fmt(l.quantity * Number(l.unitPrice))}</TableCell>
                      <TableCell>{day(l.shipDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={done ? "COMPLETE" : "PENDING"} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {tab === "matrix" && <LineMatrix lines={matrixLines} locked={matrixLocked} />}

      {tab === "amendments" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>No</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Previous values</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.amendments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No amendments
                  </TableCell>
                </TableRow>
              ) : (
                order.amendments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">#{a.amendmentNo}</TableCell>
                    <TableCell>{a.reason}</TableCell>
                    <TableCell>{Object.keys(a.previousValues as Record<string, unknown>).join(", ")}</TableCell>
                    <TableCell>{day(a.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </DetailPage>
  );
}