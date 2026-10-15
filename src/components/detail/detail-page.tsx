import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { KpiCard, type KpiItem } from "./kpi-card";
import { StatusBadge } from "./status-badge";

export type DetailTab = { key: string; label: string };

// স্পেকের স্ট্যান্ডার্ড ট্যাব। পেজ নিজের দরকারমতো বেছে নেবে।
export const STANDARD_TABS: DetailTab[] = [
  { key: "overview", label: "Overview" },
  { key: "details", label: "Details" },
  { key: "timeline", label: "Timeline" },
  { key: "documents", label: "Documents" },
  { key: "transactions", label: "Transactions" },
  { key: "approvals", label: "Approvals" },
  { key: "audit", label: "Audit" },
];

export function DetailPage({
  code,
  title,
  status,
  priority,
  owner,
  actions,
  kpis,
  tabs,
  activeTab,
  basePath,
  side,
  children,
}: {
  code: string;
  title: string;
  status?: string;
  priority?: string;
  owner?: string;
  actions?: React.ReactNode;
  kpis?: KpiItem[];
  tabs: DetailTab[];
  activeTab: string;
  basePath: string;
  side?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{code}</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && <StatusBadge status={status} />}
              {priority && <Badge variant="outline">Priority: {priority}</Badge>}
              {owner && <span className="text-sm text-muted-foreground">Owner: {owner}</span>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </Card>

      {/* KPI strip */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {/* Tabs */}
          <nav className="flex gap-1 overflow-x-auto border-b">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`${basePath}?tab=${t.key}`}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-2 text-sm",
                  activeTab === t.key
                    ? "border-gold-500 font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div>{children}</div>
        </div>

        {/* Right panel: Related records, Alerts, Next action */}
        {side && <aside className="space-y-4">{side}</aside>}
      </div>
    </div>
  );
}

export function SidePanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-1.5 text-sm">{children}</div>
    </Card>
  );
}