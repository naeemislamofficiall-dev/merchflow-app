import Link from "next/link";
import { ChartColumn, Download, FileText, Filter, Info, Printer, RotateCcw } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { REPORTS } from "./reports";
import { ReportTable } from "./report-table";

const okDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const btnOutline =
  "inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-800 hover:bg-slate-50";

function cell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  const sp = await props.searchParams;
  const canExport = can(await requireUser(), "analytics.export");
  const def = REPORTS.find((r) => r.key === sp.report) ?? REPORTS[0];
  const from = okDate(sp.from);
  const to = okDate(sp.to);
  const result = await def.run({ from, to });

  const groups = ["Merchandising", "Procurement", "Inventory", "Production", "Quality", "Shipment", "Finance"] as const;

  const rows = result.rows.map((row) => {
    const out: Record<string, string> = {};
    for (const c of result.columns) out[c.key] = cell(row[c.key]);
    return out;
  });

  const q = `${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <ChartColumn className="h-8 w-8" strokeWidth={2.4} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Analytics</h1>
            <p className="text-sm text-slate-500">Reports calculated live from your data</p>
          </div>
        </header>
      </PageBand>

      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="space-y-5 self-start rounded-card border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-navy-800">
            <Filter className="h-5 w-5 text-blue-600" /> Reports
          </h2>
          {groups.map((g) => (
            <div key={g}>
              <p className="pb-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600">{g}</p>
              <ul className="space-y-0.5">
                {REPORTS.filter((r) => r.group === g).map((r) => (
                  <li key={r.key}>
                    <Link
                      href={`/analytics?report=${r.key}`}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm text-navy-800 hover:bg-slate-50",
                        r.key === def.key && "bg-blue-50 font-semibold text-blue-700"
                      )}
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          <div className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="font-heading text-xl font-semibold text-navy-800">{def.title}</h2>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              {def.ranged ? (
                <form method="get" className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="report" value={def.key} />
                  <label className="space-y-1 text-sm">
                    <span className="block font-semibold text-navy-800">From</span>
                    <input name="from" type="date" defaultValue={from ?? ""} className={field} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="block font-semibold text-navy-800">To</span>
                    <input name="to" type="date" defaultValue={to ?? ""} className={field} />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
                  >
                    <Filter className="h-4 w-4" /> Apply
                  </button>
                  <Link href={`/analytics?report=${def.key}`} className={btnOutline}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Link>
                </form>
              ) : (
                <p className="text-sm text-slate-500">This report has no date filter.</p>
              )}

              {canExport && (
                <div className="flex flex-wrap gap-2">
                  <a href={`/analytics/export?report=${def.key}&format=csv${q}`} className={btnOutline}>
                    <Download className="h-4 w-4" /> Export CSV
                  </a>
                  <a href={`/analytics/export?report=${def.key}&format=xlsx${q}`} className={btnOutline}>
                    <Download className="h-4 w-4" /> Export Excel
                  </a>
                  <a href={`/analytics/print?report=${def.key}${q}`} className={btnOutline}>
                    <Printer className="h-4 w-4" /> PDF / Print
                  </a>
                </div>
              )}
            </div>

            {result.summary && (
              <p className="flex items-center gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                <Info className="h-5 w-5 shrink-0" /> {result.summary}
              </p>
            )}
          </div>

          <ReportTable key={`${def.key}|${from ?? ""}|${to ?? ""}`} columns={result.columns} rows={rows} />
        </div>
      </div>
    </div>
  );
}