import { redirect } from "next/navigation";
import { requireUser, can } from "@/lib/permissions";
import { toExportValue } from "@/lib/report-export";
import { REPORTS } from "../reports";
import { PrintButton } from "./print-button";

const okDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

function show(v: unknown): string {
  const x = toExportValue(v);
  if (x === null) return "-";
  if (typeof x === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(x);
  return x;
}

export default async function PrintReportPage(props: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  if (!(await can(user, "analytics.export"))) redirect("/analytics");

  const sp = await props.searchParams;
  const def = REPORTS.find((r) => r.key === sp.report);
  if (!def) redirect("/analytics");
  const from = okDate(sp.from);
  const to = okDate(sp.to);
  const result = await def.run(def.ranged ? { from, to } : {});

  return (
    <div className="print-area mx-auto max-w-5xl space-y-3 bg-white p-6 text-black">
      <style>{`
        @media print {
          aside, header, nav, .no-print { display: none !important; }
          body, main { background: #fff !important; }
          .print-area { max-width: none !important; padding: 0 !important; }
          table { font-size: 10px; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between">
        <a href={`/analytics?report=${def.key}`} className="text-sm underline">
          Back to analytics
        </a>
        <PrintButton />
      </div>

      <h1 className="text-xl font-semibold">{def.title}</h1>
      <p className="text-xs text-gray-600">
        Generated {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        {def.ranged && (from || to) ? ` | Range: ${from ?? "start"} to ${to ?? "today"}` : ""}
      </p>
      {result.summary && <p className="text-sm font-medium">{result.summary}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {result.columns.map((c) => (
              <th key={c.key} className={`border-b-2 border-black px-2 py-1 ${c.right ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 ? (
            <tr>
              <td colSpan={result.columns.length} className="px-2 py-4 text-center text-gray-500">
                No data for this report
              </td>
            </tr>
          ) : (
            result.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-300">
                {result.columns.map((c) => (
                  <td key={c.key} className={`px-2 py-1 ${c.right ? "text-right" : "text-left"}`}>
                    {show(row[c.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}