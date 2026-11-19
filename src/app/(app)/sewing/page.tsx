import { Building2, Eye, Info, Shirt } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { sewingService } from "@/services/sewing.service";
import { SewingForm } from "./sewing-form";

const pct = (n: number | null) => (n === null ? "-" : `${n}%`);

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

// SHUDHU SAJANO: sewing machine (data na). Chaile ei function ar niche <SewingMachineArt /> line ta muche dao
function SewingMachineArt() {
  return (
    <svg viewBox="0 0 160 90" className="h-24 w-44" aria-hidden="true">
      <rect x="4" y="80" width="116" height="8" rx="4" fill="#1e3a8a" />
      <path d="M14 80 V40 Q14 18 40 18 H88 Q104 18 104 34 V44 H78 V80 Z" fill="#1e3a8a" />
      <rect x="86" y="8" width="12" height="12" rx="2" fill="#1e3a8a" />
      <circle cx="46" cy="38" r="8" fill="#93c5fd" />
      <rect x="98" y="44" width="4" height="22" rx="2" fill="#1e3a8a" />
      <rect x="128" y="56" width="22" height="24" rx="4" fill="#bfdbfe" />
      <rect x="128" y="62" width="22" height="4" fill="#60a5fa" />
      <rect x="128" y="70" width="22" height="4" fill="#60a5fa" />
    </svg>
  );
}

// SHUDHU SAJANO: "No Data Yet" chhobi
function EmptyArt() {
  return (
    <svg viewBox="0 0 140 110" className="h-28 w-36" aria-hidden="true">
      <ellipse cx="70" cy="62" rx="58" ry="40" fill="#dbeafe" />
      <rect x="32" y="16" width="64" height="76" rx="8" fill="#fff" stroke="#60a5fa" strokeWidth="3" />
      <rect x="42" y="28" width="34" height="5" rx="2.5" fill="#bfdbfe" />
      <rect x="44" y="64" width="8" height="18" rx="2" fill="#60a5fa" />
      <rect x="58" y="52" width="8" height="30" rx="2" fill="#3b82f6" />
      <rect x="72" y="42" width="8" height="40" rx="2" fill="#60a5fa" />
      <circle cx="94" cy="68" r="16" fill="#fff" fillOpacity="0.7" stroke="#2563eb" strokeWidth="4" />
      <path d="M106 80 L120 94" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default async function SewingPage(props: { searchParams: Promise<{ lineId?: string; date?: string }> }) {
  const sp = await props.searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const lineId = sp.lineId ?? "";

  const opts = await sewingService.formOptions();
  const line = opts.lines.find((l) => l.id === lineId);
  const day = line ? await sewingService.lineDay(line.id, date).catch(() => null) : null;
  const orders = line ? opts.orders.filter((o) => o.factoryId === line.factoryId) : [];

  const heads = ["Hour", "Production Order", "Target", "Output", "Reject", "Rework", "Downtime", "Efficiency"];

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Shirt className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Sewing</h1>
              <p className="text-sm text-slate-500">Hourly target and output of a sewing line</p>
            </div>
          </div>
          <div className="mr-4 hidden md:block">
            <SewingMachineArt />
          </div>
        </header>
      </PageBand>

      <div className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="lineId" className="mb-1 block text-sm font-medium text-navy-800">
              Line
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
              <select id="lineId" name="lineId" defaultValue={lineId} className={`${field} min-w-64 pl-10`}>
                <option value="">Select Line...</option>
                {opts.lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-navy-800">
              Date
            </label>
            <input id="date" name="date" type="date" defaultValue={date} className={`${field} min-w-52`} />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Eye className="h-4 w-4" /> Show
          </button>
        </form>

        {!line && (
          <p className="flex items-center gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            <Info className="h-5 w-5 shrink-0" /> Pick a line and a date to see the hourly log.
          </p>
        )}
      </div>

      {!line && (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <EmptyArt />
          <h2 className="mt-3 font-heading text-xl font-semibold text-navy-800">No Data Yet</h2>
          <p className="mt-1 text-sm text-slate-600">Please select a line and date to view the sewing data.</p>
        </div>
      )}

      {line && (
        <>
          <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
            <div className="bg-navy-800 px-5 py-3.5 text-white">
              <h2 className="font-heading text-lg font-semibold">
                {line.label} on {date}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-navy-800">
                  <tr>
                    {heads.map((h, i) => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-4 py-3.5 text-[15px] font-semibold ${i >= 2 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!day || day.hours.length === 0 ? (
                    <tr className="border-t border-slate-100">
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Nothing recorded for this day yet
                      </td>
                    </tr>
                  ) : (
                    day.hours.map((h) => (
                      <tr key={h.id} className="border-t border-slate-100">
                        <td className="whitespace-nowrap px-4 py-3 text-[15px] font-medium text-navy-800">
                          {h.hour}:00 - {h.hour + 1}:00
                        </td>
                        <td className="px-4 py-3 text-[15px] text-navy-800">{h.productionOrder.productionNo}</td>
                        <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">{h.target}</td>
                        <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">{h.output}</td>
                        <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">{h.reject}</td>
                        <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">{h.rework}</td>
                        <td className="px-4 py-3 text-right text-[15px] text-navy-800">
                          {h.downtimeMinutes > 0 ? `${h.downtimeMinutes} min (${h.downtimeReason ?? ""})` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-[15px] tabular-nums text-navy-800">
                          {pct(h.efficiencyPct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {day && day.hours.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-blue-50/70 font-semibold text-navy-800">
                      <td colSpan={2} className="px-4 py-3 text-[15px]">
                        Day total
                      </td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{day.total.target}</td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{day.total.output}</td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{day.total.reject}</td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{day.total.rework}</td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{day.total.downtimeMinutes} min</td>
                      <td className="px-4 py-3 text-right text-[15px] tabular-nums">{pct(day.total.efficiencyPct)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No production order is running in this line&apos;s factory. Start one to record output.
            </p>
          ) : (
            <SewingForm key={`${line.id}-${date}`} lineId={line.id} date={date} orders={orders} />
          )}
        </>
      )}
    </div>
  );
}