import Link from "next/link";
import { CalendarDays, Plus, Truck } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { shipmentService } from "@/services/shipment.service";
import { ShipmentsTable, type ShipmentRow } from "./shipments-table";

const n = (v: number) => v.toLocaleString("en-US");
const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase();

export default async function ShipmentsPage() {
  const list = await shipmentService.list();

  const rows: ShipmentRow[] = list.map((s) => ({
    id: s.id,
    shipmentNo: s.shipmentNo,
    mode: s.mode.toLowerCase(),
    destination: s.destination ?? "",
    forwarder: s.forwarder?.name ?? "",
    cartons: s._count.lines,
    plannedShipDate: s.plannedShipDate.toISOString().slice(0, 10),
    status: s.status,
  }));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const upcoming = rows.filter((r) => r.plannedShipDate >= today).length;

  // status-wise count, jei status data te ache shudhu seigulo
  const byStatus = new Map<string, number>();
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  const top = [...byStatus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const themes = ["green", "orange"] as const;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Truck className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Shipments</h1>
              <p className="text-sm text-slate-500">Plan, book and ship closed cartons to a buyer</p>
            </div>
          </div>
          <Link
            href="/shipments/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Shipment
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard theme="blue" icon={Truck} label="Total Shipments" value={n(rows.length)} sub="All shipments" />
        {top.map(([status, count], i) => (
          <StatCard
            key={status}
            theme={themes[i]}
            icon={Truck}
            label={`Status: ${humanize(status)}`}
            value={n(count)}
            sub="Shipments in this status"
          />
        ))}
        <StatCard
          theme="violet"
          icon={CalendarDays}
          label="Upcoming"
          value={n(upcoming)}
          sub="Planned ship date today or later"
        />
      </div>

      <ShipmentsTable rows={rows} />
    </div>
  );
}