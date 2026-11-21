import { ClipboardList, Info, Play, Shirt } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { finishingService } from "@/services/finishing.service";
import { productionOrderService } from "@/services/production-order.service";
import { FinishingForm } from "./finishing-form";

const n = (v: number) => v.toLocaleString("en-US");

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

// SHUDHU SAJANO: folded shirt (data na). Chaile function ar <ShirtArt /> line ta muche dao
function ShirtArt() {
  return (
    <svg viewBox="0 0 170 80" className="h-24 w-48" aria-hidden="true">
      <rect x="10" y="50" width="150" height="24" rx="8" fill="#93c5fd" />
      <rect x="18" y="32" width="140" height="24" rx="8" fill="#60a5fa" />
      <rect x="28" y="12" width="124" height="26" rx="8" fill="#3b82f6" />
      <path d="M72 12 L90 28 L108 12 Z" fill="#bfdbfe" />
      <circle cx="90" cy="34" r="2" fill="#bfdbfe" />
    </svg>
  );
}

// SHUDHU SAJANO: "No Data Yet" chhobi
function EmptyArt() {
  return (
    <svg viewBox="0 0 140 110" className="h-28 w-36" aria-hidden="true">
      <ellipse cx="70" cy="66" rx="60" ry="38" fill="#dbeafe" />
      <path d="M70 14 V22 M70 14 a5 5 0 1 1 5 5" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M50 30 L70 24 L90 30 L108 46 L98 56 L90 50 V92 H50 V50 L42 56 L32 46 Z"
        fill="#fff"
        stroke="#2563eb"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle cx="94" cy="76" r="14" fill="#2563eb" />
      <path d="M87 76 l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function FinishingPage(props: { searchParams: Promise<{ productionOrderId?: string }> }) {
  const sp = await props.searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

  const all = await productionOrderService.list().catch(() => []);
  const running = all.filter((p) => p.status === "IN_PROGRESS");
  const selected = running.find((p) => p.id === sp.productionOrderId);

  const data = selected ? await finishingService.forProductionOrder(selected.id).catch(() => null) : null;

  const heads = ["Date", "Received", "Thread Cut", "Ironed", "Folded", "Metal", "QC Passed", "Rework", "Finished"];

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Shirt className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Finishing</h1>
              <p className="text-sm text-slate-500">
                Thread cutting, ironing, folding, metal check and final QC after sewing
              </p>
            </div>
          </div>
          <div className="mr-4 hidden md:block">
            <ShirtArt />
          </div>
        </header>
      </PageBand>

      <div className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="productionOrderId" className="mb-1 block text-sm font-semibold text-navy-800">
              Production Order
            </label>
            <div className="relative">
              <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
              <select
                id="productionOrderId"
                name="productionOrderId"
                defaultValue={selected?.id ?? ""}
                className={`${field} min-w-72 pl-10`}
              >
                <option value="">Select Production Order</option>
                {running.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productionNo} ({p.style.styleNo})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Play className="h-4 w-4" /> Show
          </button>
        </form>

        {running.length === 0 && (
          <p className="flex items-center gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            <Info className="h-5 w-5 shrink-0" /> No production order is running. Start one first.
          </p>
        )}
      </div>

      {!selected && (
        <div className="flex flex-col items-center rounded-card border border-slate-100 bg-white px-4 py-10 text-center shadow-card">
          <EmptyArt />
          <h2 className="mt-3 font-heading text-xl font-semibold text-navy-800">No Data Yet</h2>
          <p className="mt-1 text-sm text-slate-600">Please select a production order to view finishing details.</p>
        </div>
      )}

      {selected && data && (
        <>
          <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <StatCard theme="blue" icon={Shirt} label="Sewing Output" value={n(data.sewingOutput)} unit="pcs" sub="Sewn so far" />
            <StatCard theme="violet" icon={ClipboardList} label="Received in Finishing" value={n(data.totals.input)} unit="pcs" sub="From sewing" />
            <StatCard theme="orange" icon={Info} label="Still Waiting" value={n(data.waitingForFinishing)} unit="pcs" sub="Not received yet" />
            <StatCard theme="green" icon={Play} label="Finished" value={n(data.totals.output)} unit="pcs" sub="Final output" />
          </div>

          <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
            <div className="bg-navy-800 px-5 py-3.5 text-white">
              <h2 className="font-heading text-lg font-semibold">{selected.productionNo}: Daily Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-navy-800">
                  <tr>
                    {heads.map((h, i) => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-4 py-3.5 text-[15px] font-semibold ${i > 0 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.logs.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        Nothing recorded yet
                      </td>
                    </tr>
                  ) : (
                    data.logs.map((l) => (
                      <tr key={l.id} className="border-t border-slate-100">
                        <td className="whitespace-nowrap px-4 py-3 text-[15px] font-medium text-navy-800">
                          {l.logDate.toISOString().slice(0, 10)}
                        </td>
                        {[l.inputQty, l.threadCutQty, l.ironedQty, l.foldedQty, l.metalCheckedQty, l.qcPassedQty, l.reworkQty, l.outputQty].map(
                          (v, i) => (
                            <td key={i} className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                              {v}
                            </td>
                          )
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {data.logs.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-blue-50/70 font-semibold text-navy-800">
                      <td className="px-4 py-3 text-[15px]">Total</td>
                      {[
                        data.totals.input,
                        data.totals.threadCut,
                        data.totals.ironed,
                        data.totals.folded,
                        data.totals.metalChecked,
                        data.totals.qcPassed,
                        data.totals.rework,
                        data.totals.output,
                      ].map((v, i) => (
                        <td key={i} className="px-4 py-3 text-right text-[15px] tabular-nums">
                          {v}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <FinishingForm key={selected.id} productionOrderId={selected.id} date={today} />
        </>
      )}
    </div>
  );
}