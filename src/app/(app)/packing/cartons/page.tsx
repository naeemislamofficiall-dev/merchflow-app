import Link from "next/link";
import { CircleCheck, Clock, ListFilter, Package, Plus, Truck } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { packingService } from "@/services/packing.service";
import { CartonsTable, type CartonRow } from "./cartons-table";

const STATUSES = ["OPEN", "CLOSED", "SHIPPED"] as const;
const n = (v: number) => v.toLocaleString("en-US");

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

export default async function CartonsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams;
  const status = STATUSES.find((s) => s === sp.status);

  // shob carton ek bar ani, count gulo filter-er upor nirbhor korbe na
  const all = await packingService.list({});
  const count = (s: string) => all.filter((c) => c.status === s).length;

  const rows: CartonRow[] = all
    .filter((c) => !status || c.status === status)
    .map((c) => ({
      id: c.id,
      cartonNo: c.cartonNo,
      packType: c.packType.toLowerCase(),
      pieces: c.lines.reduce((s, l) => s + l.quantity, 0),
      grossWeight: c.grossWeightKg ? String(Number(c.grossWeightKg)) : "",
      status: c.status,
    }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Package className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Cartons</h1>
              <p className="text-sm text-slate-500">
                Finished goods packed into cartons. Only closed cartons can go into a shipment.
              </p>
            </div>
          </div>
          <Link
            href="/packing/cartons/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Carton
          </Link>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard theme="blue" icon={Package} label="Total Cartons" value={n(all.length)} sub="All cartons" />
        <StatCard theme="orange" icon={Clock} label="Open" value={n(count("OPEN"))} sub="Still being packed" />
        <StatCard theme="green" icon={CircleCheck} label="Closed" value={n(count("CLOSED"))} sub="Ready for a shipment" />
        <StatCard theme="violet" icon={Truck} label="Shipped" value={n(count("SHIPPED"))} sub="Already shipped" />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-semibold text-navy-800">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className={`${field} min-w-48 capitalize`}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <ListFilter className="h-4 w-4" /> Filter
        </button>
      </form>

      <CartonsTable key={status ?? "all"} rows={rows} hasAny={all.length > 0} />
    </div>
  );
}