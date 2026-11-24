import { redirect } from "next/navigation";
import { Barcode, Box, Check, FileText, Inbox, MapPin, SlidersHorizontal, Tag, Warehouse } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { materialService } from "@/services/material.service";
import { warehouseService } from "@/services/warehouse.service";
import { createStockAdjustmentAction } from "./actions";

const REASONS: [string, string][] = [
  ["COUNT_CORRECTION", "Cycle count correction"],
  ["DAMAGE", "Damage"],
  ["SCRAP", "Scrap"],
  ["LOSS", "Loss"],
  ["FOUND", "Found stock"],
  ["SUPPLIER_RETURN", "Supplier return"],
  ["OTHER", "Other"],
];
const reasonLabel = new Map(REASONS);
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

const LABEL = "block text-sm font-semibold text-navy-800";
const REQ = <span className="ml-1 text-rose-500">*</span>;
const FIELD =
  "h-12 w-full rounded-lg border bg-card pl-11 pr-4 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200";
const ICON = "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500";
const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";

export default async function StockAdjustmentsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) redirect("/dashboard");
  const [materials, warehouses, rows, params] = await Promise.all([
    materialService.list({ activeOnly: true }),
    warehouseService.listAll(),
    prisma.stockAdjustment.findMany({
      where: { companyId: user.companyId },
      include: {
        material: { select: { code: true, name: true, unit: true } },
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    searchParams,
  ]);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
            <SlidersHorizontal className="h-10 w-10" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">
              Stock adjustments &amp; cycle count
            </h1>
            <p className="text-sm text-navy-800">
              Post audited inventory corrections with a reason. Negative stock and reason/direction rules are
              validated by the inventory service.
            </p>
          </div>
        </header>
      </PageBand>

      {params.saved === "1" && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Adjustment posted.
        </p>
      )}

      <section className="rounded-card border bg-card p-6 shadow-card">
        <h2 className="mb-5 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          New adjustment
        </h2>
        <form action={createStockAdjustmentAction} className="space-y-5">
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <label className={LABEL}>
              Material{REQ}
              <span className="relative mt-1.5 block">
                <Box className={ICON} />
                <select required name="materialId" className={`${FIELD} appearance-none`}>
                  <option value="">Select material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={LABEL}>
              Warehouse{REQ}
              <span className="relative mt-1.5 block">
                <Warehouse className={ICON} />
                <select required name="warehouseId" className={`${FIELD} appearance-none`}>
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} · {w.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={LABEL}>
              Quantity change (+/-){REQ}
              <input
                required
                type="number"
                step="0.0001"
                name="quantityChange"
                placeholder="-2.5 or 4"
                className="mt-1.5 h-12 w-full rounded-lg border bg-card px-4 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className={LABEL}>
              Reason{REQ}
              <span className="relative mt-1.5 block">
                <Tag className={ICON} />
                <select required name="reason" className={`${FIELD} appearance-none`}>
                  {REASONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={LABEL}>
              Lot ID (optional)
              <span className="relative mt-1.5 block">
                <Barcode className={ICON} />
                <input name="lotId" placeholder="Enter lot ID" className={FIELD} />
              </span>
            </label>
            <label className={LABEL}>
              Bin ID (optional)
              <span className="relative mt-1.5 block">
                <MapPin className={ICON} />
                <input name="binId" placeholder="Enter bin ID" className={FIELD} />
              </span>
            </label>
            <label className={`${LABEL} sm:col-span-2 xl:col-span-3`}>
              Reason / evidence{REQ}
              <span className="relative mt-1.5 block">
                <FileText className={ICON} />
                <input
                  required
                  minLength={3}
                  name="remarks"
                  placeholder="Physical count on warehouse aisle B"
                  className={FIELD}
                />
              </span>
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-navy-800 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
            Post adjustment
          </button>
        </form>
      </section>

      <section className="rounded-card border bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          Recent adjustments
        </h2>
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-860px text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} rounded-l-lg text-left`}>Reference</th>
                <th className={`${TH} text-left`}>Material</th>
                <th className={`${TH} text-left`}>Warehouse</th>
                <th className={`${TH} text-right`}>Change</th>
                <th className={`${TH} text-left`}>Reason</th>
                <th className={`${TH} text-left`}>Date</th>
                <th className={`${TH} rounded-r-lg text-left`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="stagger stagger-fast">
              {rows.map((r) => {
                const change = Number(r.quantityChange);
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{r.adjustmentNo}</td>
                    <td className="px-4 py-3 text-[15px] text-navy-800">
                      {r.material.code} · {r.material.name}
                    </td>
                    <td className="px-4 py-3 text-[15px] text-navy-800">{r.warehouse.code}</td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-[15px] font-semibold tabular-nums ${
                        change < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {fmt.format(change)} {r.material.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {reasonLabel.get(r.reason) ?? r.reason}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[15px] text-navy-800">
                      {r.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-[15px] text-navy-800">{r.remarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500">
              <Inbox className="h-9 w-9 animate-float text-slate-300" />
              No adjustments posted yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}