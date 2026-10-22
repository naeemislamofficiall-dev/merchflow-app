import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { can, requireUser } from "@/lib/permissions";
import { budgetService } from "@/services/budget.service";
import { BudgetBoard, type BudgetRow } from "./budget-board";
import { BudgetForm } from "./budget-form";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default async function BudgetsPage(props: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireUser();
  if (!can(user, "budget.view")) redirect("/dashboard");

  const sp = await props.searchParams;
  const parsed = Number(sp.year);
  const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : new Date().getFullYear();

  const canCreate = can(user, "budget.create");
  const [{ rows, totals }, options] = await Promise.all([
    budgetService.overview(year),
    canCreate ? budgetService.formOptions() : Promise.resolve({ factories: [] }),
  ]);
  const factoryLabel = new Map(options.factories.map((f) => [f.id, f.label]));

  const board: BudgetRow[] = rows.map((r) => ({
    id: r.id,
    period: `${MONTHS[r.month - 1]} ${r.year}`,
    category: r.category,
    factory: r.factoryId ? (factoryLabel.get(r.factoryId) ?? "Factory") : "All",
    status: r.status,
    budget: r.budget,
    actual: r.actual,
    remaining: r.remaining,
    usedPct: r.usedPct,
    over: r.over,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Budgets"
        description="Monthly budget by expense category. Actual is the sum of approved expenses in that month"
        actions={
          <>
            <Link href={`/finance/budgets?year=${year - 1}`} className="text-sm text-primary hover:underline">
              {year - 1}
            </Link>
            <span className="text-sm font-medium">{year}</span>
            <Link href={`/finance/budgets?year=${year + 1}`} className="text-sm text-primary hover:underline">
              {year + 1}
            </Link>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Approved budget", money(totals.budget)],
          ["Actual spent", money(totals.actual)],
          ["Remaining", money(totals.remaining)],
          ["Used", totals.usedPct === null ? "-" : `${totals.usedPct}%`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <BudgetBoard
        rows={board}
        canCreate={canCreate}
        canApprove={can(user, "budget.approve")}
        canCancel={can(user, "budget.cancel")}
      />
      {canCreate && <BudgetForm year={year} factories={options.factories} />}
    </div>
  );
}
