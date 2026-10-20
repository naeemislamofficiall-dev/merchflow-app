import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { KpiCard, type KpiTone } from "@/components/detail/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { alertService, type Severity } from "@/services/alert.service";
import { cn } from "@/lib/utils";

const LEVELS: { key: Severity; tone: KpiTone }[] = [
  { key: "CRITICAL", tone: "bad" },
  { key: "HIGH", tone: "warn" },
  { key: "MEDIUM", tone: "default" },
  { key: "LOW", tone: "default" },
];

const BADGE: Record<Severity, NonNullable<BadgeProps["variant"]>> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "muted",
};

export default async function AlertsPage(props: { searchParams: Promise<{ severity?: string }> }) {
  const sp = await props.searchParams;
  const active = LEVELS.find((l) => l.key === sp.severity)?.key; // অচেনা মান হলে সব দেখায়

  // একবারই হিসাব; গণনা আর ফিল্টার দুটোই এখান থেকে
  const all = await alertService.list();
  const count = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<Severity, number>;
  for (const a of all) count[a.severity]++;
  const rows = active ? all.filter((a) => a.severity === active) : all;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        description="Exceptions that need attention right now. Calculated live from your data"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {LEVELS.map((l) => (
          <Link
            key={l.key}
            href={active === l.key ? "/alerts" : `/alerts?severity=${l.key}`}
            className={cn("rounded-lg", active === l.key && "ring-2 ring-denim-600")}
          >
            <KpiCard label={l.key.toLowerCase()} value={count[l.key]} tone={count[l.key] > 0 ? l.tone : "default"} />
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    {active ? `No ${active.toLowerCase()} alerts` : "All clear. No alerts right now"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={BADGE[a.severity]} className="capitalize">
                        {a.severity.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>
                      <Link href={a.href} className="font-medium text-denim-700 hover:underline">
                        {a.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{a.since.toISOString().slice(0, 10)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}