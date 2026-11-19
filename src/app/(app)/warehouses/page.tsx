import { Box, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { warehouseService } from "@/services/warehouse.service";
import { BinForm, WarehouseForm } from "./warehouse-forms";

const TH = "px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-navy-800";
const nice = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export default async function WarehousesPage() {
  const [warehouses, factories] = await Promise.all([
    warehouseService.listAll(),
    warehouseService.listFactories(),
  ]);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Box className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Warehouses</h1>
              <p className="text-sm text-navy-800">Stores and bins where material is kept</p>
            </div>
          </div>
          <a
            href="#add-warehouse"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Warehouse
          </a>
        </header>
      </PageBand>

      <section className="rounded-card border bg-card p-5 shadow-card">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className={`${TH} rounded-l-lg text-left`}>Code</th>
                <th className={`${TH} text-left`}>Name</th>
                <th className={`${TH} text-left`}>Factory</th>
                <th className={`${TH} text-left`}>Type</th>
                <th className={`${TH} rounded-r-lg text-left`}>Bins</th>
              </tr>
            </thead>
            <tbody className="stagger stagger-fast">
              {warehouses.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-[15px] font-semibold text-navy-800">{w.code}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{w.name}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{w.factory.code}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">{nice(w.type)}</td>
                  <td className="px-4 py-3 text-[15px] text-navy-800">
                    {w.bins.length === 0 ? "-" : w.bins.map((b) => b.code).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {warehouses.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">No warehouses yet</p>
          )}
        </div>
      </section>

      <WarehouseForm factories={factories.map((f) => ({ id: f.id, label: `${f.code} - ${f.name}` }))} />
      <BinForm warehouses={warehouses.map((w) => ({ id: w.id, label: `${w.code} - ${w.name}` }))} />
    </div>
  );
}