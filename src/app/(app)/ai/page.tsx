import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { aiInsightsService } from "@/services/ai-insights.service";

const BADGE = { HIGH: "bg-red-600 text-white", MEDIUM: "bg-amber-100 text-amber-900", LOW: "bg-emerald-100 text-emerald-900" } as const;

export default async function AiPage() {
  const user = await requireUser();
  if (!can(user, "ai.view")) redirect("/dashboard");
  const [risks, brief] = await Promise.all([aiInsightsService.orderRisks(), aiInsightsService.brief()]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Order risk & management brief"
        description="Rule-based and explainable: every flag lists the exact data behind it. No guessing, no external AI service."
      />

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Today&apos;s brief ({brief.date.toISOString().slice(0, 10)})</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{brief.activeOrders} active order(s): <strong>{brief.high.length} high risk</strong>, {brief.medium} medium.</li>
          <li>{brief.lateSupplierCount} supplier(s) have open deliveries running late.</li>
          <li>{brief.failedAqlLast7Days} AQL inspection(s) failed in the last 7 days.</li>
          <li>{brief.linesReporting} sewing line(s) reported today; {brief.linesBelow80Pct} below 80% of target.</li>
          <li>{brief.expiredCerts} compliance certificate(s) already expired.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Orders by risk</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Risk", "Score", "Order", "Buyer", "Ship date", "Why"].map((x) => <th key={x} className="px-3 py-2 text-left">{x}</th>)}</tr></thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.orderId} className="border-t align-top">
                  <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${BADGE[r.level]}`}>{r.level}</span></td>
                  <td className="px-3 py-2">{r.score}</td>
                  <td className="px-3 py-2"><Link className="text-primary underline" href={`/orders/${r.orderId}`}>{r.orderNo}</Link></td>
                  <td className="px-3 py-2">{r.buyer}</td>
                  <td className="px-3 py-2">{r.shipDate ? r.shipDate.toISOString().slice(0, 10) : "-"}</td>
                  <td className="px-3 py-2">{r.reasons.length ? <ul className="list-disc pl-4">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul> : <span className="text-muted-foreground">No issues found</span>}</td>
                </tr>
              ))}
              {risks.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No active orders.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
