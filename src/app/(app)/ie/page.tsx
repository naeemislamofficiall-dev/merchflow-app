import { Activity, Filter, Gauge, Shirt, Timer, Users, Sigma, ClipboardList } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { ieService } from "@/services/ie.service";
import { styleService } from "@/services/style.service";
import { BulletinForm } from "./bulletin-form";

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3 text-[15px] text-navy-800";

export default async function IePage(props: {
  searchParams: Promise<{ styleId?: string; targetPerHour?: string; efficiencyPct?: string }>;
}) {
  const sp = await props.searchParams;
  const styles = await styleService.list().catch(() => []);
  const style = styles.find((s) => s.id === sp.styleId);

  const bulletin = style ? await ieService.bulletin(style.id).catch(() => null) : null;

  const target = Number(sp.targetPerHour);
  const eff = sp.efficiencyPct ? Number(sp.efficiencyPct) : undefined;
  const wantsBalance = !!style && !!bulletin && bulletin.operations.length > 0 && target > 0;
  let balance: Awaited<ReturnType<typeof ieService.lineBalance>> | null = null;
  let balanceError = "";
  if (wantsBalance && style) {
    try {
      balance = await ieService.lineBalance({
        styleId: style.id,
        targetPerHour: target,
        ...(eff !== undefined && eff > 0 ? { efficiencyPct: eff } : {}),
      });
    } catch (e) {
      balanceError = e instanceof Error ? e.message : "Could not work out the line balance";
    }
  }

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <Timer className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Industrial Engineering</h1>
            <p className="text-sm text-slate-500">
              Operation bulletin (SMV of every operation) and line balancing for a style
            </p>
          </div>
        </header>
      </PageBand>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div>
          <label htmlFor="styleId" className="mb-1 block text-sm font-semibold text-navy-800">
            Style
          </label>
          <div className="relative">
            <Shirt className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
            <select
              id="styleId"
              name="styleId"
              defaultValue={style?.id ?? ""}
              className={`${field} min-w-72 pl-10`}
            >
              <option value="">Select Style...</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.styleNo} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <Filter className="h-4 w-4" /> Show
        </button>
      </form>

      {!style && (
        <div className="flex flex-col items-center rounded-card border border-slate-100 bg-white px-4 py-12 text-center shadow-card">
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
              <ClipboardList className="h-10 w-10" strokeWidth={2} />
            </span>
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold text-navy-800">No Data Yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Please select a style to view the operation bulletin and line balancing details.
          </p>
        </div>
      )}

      {style && bulletin && (
        <>
          <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
            <div className="bg-navy-800 px-5 py-3.5 text-white">
              <h2 className="font-heading text-lg font-semibold">
                {style.styleNo}: Bulletin (Total SMV {bulletin.totalSmv})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-navy-800">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Operation</th>
                    <th className={th}>Machine</th>
                    <th className={th}>Skill</th>
                    <th className={`${th} text-right`}>SMV</th>
                    <th className={`${th} text-right`}>Operators</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletin.operations.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No operations yet. Add them below.
                      </td>
                    </tr>
                  ) : (
                    bulletin.operations.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100">
                        <td className={td}>{o.seq}</td>
                        <td className={`${td} font-medium`}>{o.name}</td>
                        <td className={td}>{o.machineType ?? "-"}</td>
                        <td className={td}>{o.skillLevel ?? "-"}</td>
                        <td className={`${td} text-right tabular-nums`}>{o.smv}</td>
                        <td className={`${td} text-right tabular-nums`}>{o.operators}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {bulletin.operations.length > 0 && (
            <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
              <div className="bg-navy-800 px-5 py-3.5 text-white">
                <h2 className="font-heading text-lg font-semibold">Line Balance</h2>
              </div>
              <div className="space-y-5 p-5">
                <form method="get" className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="styleId" value={style.id} />
                  <div>
                    <label htmlFor="targetPerHour" className="mb-1 block text-sm font-semibold text-navy-800">
                      Target pieces per hour
                    </label>
                    <input
                      id="targetPerHour"
                      name="targetPerHour"
                      type="number"
                      step="any"
                      min="0"
                      defaultValue={sp.targetPerHour ?? ""}
                      className={`${field} w-56`}
                    />
                  </div>
                  <div>
                    <label htmlFor="efficiencyPct" className="mb-1 block text-sm font-semibold text-navy-800">
                      Efficiency % (blank = 100)
                    </label>
                    <input
                      id="efficiencyPct"
                      name="efficiencyPct"
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      defaultValue={sp.efficiencyPct ?? ""}
                      className={`${field} w-56`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
                  >
                    Work out
                  </button>
                </form>

                {balanceError && <p className="text-sm text-destructive">{balanceError}</p>}

                {balance && (
                  <>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                      <StatCard
                        theme="blue"
                        icon={Users}
                        label="Operators Now / Needed"
                        value={`${balance.totalOperators} / ${balance.neededOperatorsTotal}`}
                        sub="Current vs required"
                      />
                      <StatCard
                        theme="green"
                        icon={Activity}
                        label="Line Output"
                        value={String(balance.lineOutputPerHour)}
                        unit="pcs/hr"
                        sub="Line can make per hour"
                      />
                      <StatCard
                        theme="violet"
                        icon={Gauge}
                        label="Balance Efficiency"
                        value={`${balance.balanceEfficiencyPct}%`}
                        sub="How even the line is"
                      />
                      <StatCard
                        theme="orange"
                        icon={Sigma}
                        label="Total SMV"
                        value={String(balance.totalSmv)}
                        unit="min"
                        sub="All operations"
                      />
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-navy-800">
                          <tr>
                            <th className={th}>#</th>
                            <th className={th}>Operation</th>
                            <th className={`${th} text-right`}>Operators</th>
                            <th className={`${th} text-right`}>Needed</th>
                            <th className={`${th} text-right`}>Capacity / hr</th>
                            <th className={`${th} text-right`}>Load %</th>
                            <th className={th}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balance.operations.map((o) => (
                            <tr key={o.id} className="border-t border-slate-100">
                              <td className={td}>{o.seq}</td>
                              <td className={`${td} font-medium`}>{o.name}</td>
                              <td className={`${td} text-right tabular-nums`}>{o.operators}</td>
                              <td className={`${td} text-right tabular-nums`}>{o.neededOperators}</td>
                              <td className={`${td} text-right tabular-nums`}>{o.capacityPerHour}</td>
                              <td
                                className={`${td} text-right tabular-nums ${
                                  o.bottleneck ? "font-semibold text-red-600" : ""
                                }`}
                              >
                                {o.utilizationPct}%
                              </td>
                              <td className={td}>
                                {o.bottleneck ? "Bottleneck: below target" : o.slowest ? "Slowest operation" : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <BulletinForm
            key={`${style.id}-${bulletin.operations.length}-${bulletin.totalSmv}`}
            styleId={style.id}
            initial={bulletin.operations.map((o) => ({
              name: o.name,
              machineType: o.machineType ?? "",
              smv: String(o.smv),
              skillLevel: o.skillLevel ?? "",
              operators: String(o.operators),
            }))}
          />
        </>
      )}
    </div>
  );
}