import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  PackageOpen,
  ScrollText,
  Send,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { materialService } from "@/services/material.service";
import { warehouseService } from "@/services/warehouse.service";
import { PageBand } from "@/components/approvals/ui";
import { WarehouseArt } from "@/components/inventory/warehouse-art";
import { createStockTransferAction } from "./actions";

const TZ = "Asia/Dhaka";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const input = `${field} h-11`;
const textarea = `${field} py-2.5`;

const HEAD = ["Date", "Material", "Roll", "From", "To", "Quantity", "Remarks"];

type TransferRow = {
  id: string;
  date: string;
  material: string;
  roll: string;
  from: string;
  to: string;
  qty: string;
  remarks: string;
};

function Field({
  icon: Icon,
  label,
  htmlFor,
  optional,
  hint,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-navy-800">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
        {optional && <span className="font-normal text-slate-400">(Optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "-mb-px border-b-2 py-4 text-sm font-semibold transition-colors",
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      )}
    >
      {children}
    </Link>
  );
}

function TransfersTable({ rows }: { rows: TransferRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {HEAD.map((x) => (
              <th
                key={x}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40">
              <td className="whitespace-nowrap px-4 py-3">{r.date}</td>
              <td className="px-4 py-3">{r.material}</td>
              <td className="px-4 py-3">{r.roll}</td>
              <td className="px-4 py-3">{r.from}</td>
              <td className="px-4 py-3">{r.to}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">{r.qty}</td>
              <td className="px-4 py-3 text-slate-600">{r.remarks}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={HEAD.length} className="px-4 py-10">
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="mb-2 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                    <PackageOpen className="h-8 w-8" strokeWidth={1.8} />
                  </span>
                  <p className="font-semibold text-navy-800">No transfers posted yet</p>
                  <p className="text-xs text-slate-500">Your stock transfer history will appear here.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function StockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; tab?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) redirect("/dashboard");
  const canTransfer = can(user, "inventory.transfer");

  const [materials, warehouses, outs, params] = await Promise.all([
    materialService.list({ activeOnly: true }),
    warehouseService.listAll(),
    prisma.stockTransaction.findMany({
      where: { companyId: user.companyId, refType: "TRANSFER", type: "TRANSFER_OUT" },
      include: {
        material: { select: { code: true, name: true, unit: true } },
        warehouse: { select: { code: true } },
        roll: { select: { rollNo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    searchParams,
  ]);

  // Prottek transfer-e duto entry: OUT (source) ar IN (destination). Destination IN theke ana hoy.
  const ins = await prisma.stockTransaction.findMany({
    where: {
      companyId: user.companyId,
      refType: "TRANSFER",
      type: "TRANSFER_IN",
      refId: { in: outs.map((o) => o.refId).filter((x): x is string => !!x) },
    },
    include: { warehouse: { select: { code: true } } },
  });
  const toByRef = new Map(ins.map((i) => [i.refId, i.warehouse.code]));

  const rows: TransferRow[] = outs.map((r) => ({
    id: r.id,
    date: r.createdAt.toLocaleDateString("en-CA", { timeZone: TZ }),
    material: `${r.material.code} · ${r.material.name}`,
    roll: r.roll?.rollNo ?? "—",
    from: r.warehouse.code,
    to: toByRef.get(r.refId) ?? "—",
    qty: `${Math.abs(Number(r.quantity)).toLocaleString()} ${r.material.unit}`,
    remarks: r.remarks ?? "",
  }));

  const tab = canTransfer && params.tab !== "recent" ? "new" : "recent";

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <ArrowLeftRight className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Stock Transfers</h1>
            <p className="text-sm text-slate-500">Move material between warehouses or bins.</p>
          </div>
          <WarehouseArt className="pointer-events-none absolute -bottom-4 right-0 hidden h-32 md:block" />
        </header>
      </PageBand>

      {params.saved === "1" && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4 shrink-0" /> Transfer posted.
        </p>
      )}
      {params.error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <CircleAlert className="h-4 w-4 shrink-0" /> {params.error}
        </p>
      )}

      <section className="rounded-card border border-slate-100 bg-white shadow-card">
        <nav className="flex gap-8 border-b border-slate-100 px-6" aria-label="Transfer views">
          {canTransfer && (
            <TabLink href="/inventory/transfers?tab=new" active={tab === "new"}>
              New Transfer
            </TabLink>
          )}
          <TabLink href="/inventory/transfers?tab=recent" active={tab === "recent"}>
            Recent Transfers
          </TabLink>
        </nav>

        {tab === "new" ? (
          <form action={createStockTransferAction} className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-3">
            <Field icon={Package} label="Material" htmlFor="materialId" className="md:col-span-3">
              <select required id="materialId" name="materialId" className={input}>
                <option value="">Select material</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field icon={Warehouse} label="From Warehouse" htmlFor="fromWarehouseId">
              <select required id="fromWarehouseId" name="fromWarehouseId" className={input}>
                <option value="">Select source</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field icon={Warehouse} label="To Warehouse" htmlFor="toWarehouseId">
              <select required id="toWarehouseId" name="toWarehouseId" className={input}>
                <option value="">Select destination</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field icon={Package} label="Quantity" htmlFor="quantity">
              <input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                name="quantity"
                className={input}
                placeholder="e.g. 150"
              />
            </Field>

            <Field
              icon={ScrollText}
              label="Roll No."
              htmlFor="rollNo"
              optional
              hint="Roll dile puro roll jabe, quantity lagbe na."
            >
              <input id="rollNo" name="rollNo" className={input} placeholder="e.g. FAB-LOT22-R0047" />
            </Field>
            <Field icon={MapPin} label="From Bin ID" htmlFor="fromBinId" optional>
              <input id="fromBinId" name="fromBinId" className={input} placeholder="e.g. A1-01" />
            </Field>
            <Field icon={MapPin} label="To Bin ID" htmlFor="toBinId" optional>
              <input id="toBinId" name="toBinId" className={input} placeholder="e.g. B1-01" />
            </Field>

            <Field icon={MessageSquare} label="Remarks" htmlFor="remarks" className="md:col-span-3">
              <textarea
                id="remarks"
                name="remarks"
                rows={2}
                maxLength={300}
                className={textarea}
                placeholder="Why is this being moved?"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-4 md:col-span-3">
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" /> Post Transfer <ChevronRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-500">
                Source stock is checked and both ledger entries are posted together.
              </p>
            </div>
          </form>
        ) : (
          <div className="p-4">
            <TransfersTable rows={rows} />
          </div>
        )}
      </section>

      {tab === "new" && (
        <section className="rounded-card border border-slate-100 bg-white shadow-card">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-navy-800">
              <Clock className="h-5 w-5 text-blue-600" /> Recent Transfers
            </h2>
            {rows.length > 5 && (
              <Link
                href="/inventory/transfers?tab=recent"
                scroll={false}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="p-4">
            <TransfersTable rows={rows.slice(0, 5)} />
          </div>
        </section>
      )}
    </div>
  );
}