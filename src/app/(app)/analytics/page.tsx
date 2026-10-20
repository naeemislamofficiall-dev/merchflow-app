import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { REPORTS } from "./reports";

const okDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

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
  const def = REPORTS.find((r) => r.key === sp.report) ?? REPORTS[0];
  const from = okDate(sp.from);
  const to = okDate(sp.to);
  const result = await def.run({ from, to });

  const groups = ["Merchandising", "Procurement", "Inventory"] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="Reports calculated live from your data" />

      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <nav className="space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</p>
              <ul className="space-y-0.5">
                {REPORTS.filter((r) => r.group === g).map((r) => (
                  <li key={r.key}>
                    <Link
                      href={`/analytics?report=${r.key}`}
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                        r.key === def.key && "bg-denim-100 font-medium"
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

        <div className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold">{def.title}</h2>

          {def.ranged && (
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="report" value={def.key} />
              <label className="text-xs text-muted-foreground">
                From
                <Input name="from" type="date" defaultValue={from ?? ""} className="mt-1" />
              </label>
              <label className="text-xs text-muted-foreground">
                To
                <Input name="to" type="date" defaultValue={to ?? ""} className="mt-1" />
              </label>
              <Button>Apply</Button>
            </form>
          )}

          {result.summary && <p className="text-sm font-medium">{result.summary}</p>}

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {result.columns.map((c) => (
                      <TableHead key={c.key} className={c.right ? "text-right" : undefined}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={result.columns.length} className="h-20 text-center text-muted-foreground">
                        No data for this report
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.rows.map((row, i) => (
                      <TableRow key={i}>
                        {result.columns.map((c) => (
                          <TableCell key={c.key} className={c.right ? "text-right" : undefined}>
                            {cell(row[c.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}