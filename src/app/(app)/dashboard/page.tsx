import { KpiCard } from "@/components/detail/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { dashboardService } from "@/services/dashboard.service";

const num = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

// কোনো অংশের permission না থাকলে ওই অংশ বাদ, পুরো পেজ ভাঙে না
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [ceo, merch, proc] = await Promise.all([
    safe(() => dashboardService.ceo()),
    safe(() => dashboardService.merchandising()),
    safe(() => dashboardService.procurement()),
  ]);

  if (!ceo && !merch && !proc) {
    return <p className="text-muted-foreground">You do not have access to the dashboard.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Management overview" />

      {ceo && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Executive</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total orders" value={num(ceo.totalOrders)} />
            <KpiCard label="Open orders" value={num(ceo.openOrders)} />
            <KpiCard label="Order value" value={`${ceo.currency} ${num(ceo.orderValue)}`} />
            <KpiCard
              label="Material exposure"
              value={`${ceo.currency} ${num(ceo.materialExposure)}`}
              hint="Open PO, not yet received"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Production value, shipment value, on-time shipment, factory efficiency and receivables will
            appear after those modules are built.
          </p>
        </section>
      )}

      {merch && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Merchandising</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Open orders" value={merch.openOrders} />
            <KpiCard label="T&A risk" value={merch.tnaRisk} tone={merch.tnaRisk > 0 ? "bad" : "good"} />
            <KpiCard label="Sample delays" value={merch.sampleDelays} tone={merch.sampleDelays > 0 ? "warn" : "good"} />
            <KpiCard label="Material booking" value={merch.materialBookingPending} hint="Shortage, no PR yet" />
            <KpiCard label="Buyer approvals" value={merch.buyerApprovals} hint="Samples at buyer" />
            <KpiCard label="Shipment risk" value={merch.shipmentRisk} tone={merch.shipmentRisk > 0 ? "bad" : "good"} hint="Ship date within 14 days" />
          </div>
        </section>
      )}

      {proc && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Procurement</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Open PR" value={proc.openPr} />
            <KpiCard label="Open PO" value={proc.openPo} />
            <KpiCard label="Supplier delays" value={proc.supplierDelays} tone={proc.supplierDelays > 0 ? "bad" : "good"} />
            <KpiCard label="Material shortage" value={proc.materialShortage} tone={proc.materialShortage > 0 ? "warn" : "good"} />
            <KpiCard label="Spend (month)" value={`${proc.currency} ${num(proc.spendThisMonth)}`} />
            <KpiCard label="Spend (year)" value={`${proc.currency} ${num(proc.spendThisYear)}`} />
          </div>
        </section>
      )}
    </div>
  );
}