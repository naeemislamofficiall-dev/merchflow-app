import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { AT_RISK_WINDOW_DAYS, SHIPMENT_WINDOW_DAYS } from "@/lib/tna-risk";
import { tnaViewService } from "@/services/tna-view.service";

const BADGE: Record<string, string> = {
  SHIPMENT_RISK: "bg-red-600 text-white",
  OVERDUE: "bg-red-100 text-red-900",
  AT_RISK: "bg-amber-100 text-amber-900",
};
const LABEL: Record<string, string> = { SHIPMENT_RISK: "SHIPMENT RISK", OVERDUE: "OVERDUE", AT_RISK: "AT RISK" };

export default async function TnaRiskPage() {
  const user = await requireUser();
  if (!can(user, "tna.view")) redirect("/dashboard");
  const rows = await tnaViewService.risk();
  const count = (l: string) => rows.filter((r) => r.level === l).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="T&A risk"
        description={`AT RISK = due within ${AT_RISK_WINDOW_DAYS} days and predecessor open. OVERDUE = date passed. SHIPMENT RISK = overdue and ship date within ${SHIPMENT_WINDOW_DAYS} days.`}
      />
      <div className="flex gap-3 text-sm">
        <span className="rounded bg-red-600 px-2 py-1 text-white">Shipment risk: {count("SHIPMENT_RISK")}</span>
        <span className="rounded bg-red-100 px-2 py-1 text-red-900">Overdue: {count("OVERDUE")}</span>
        <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">At risk: {count("AT_RISK")}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Risk", "Order / Style", "Milestone", "Due", "Late (days)", "Ship date", "Waiting for"].map((x) => (
                <th key={x} className="px-3 py-2 text-left">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${BADGE[r.level]}`}>{LABEL[r.level]}</span></td>
                <td className="px-3 py-2"><Link className="text-primary underline" href={`/tna/${r.planId}`}>{r.order ?? "-"} / {r.style}</Link></td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.due.toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2">{r.lateDays || "-"}</td>
                <td className="px-3 py-2">{r.shipDate.toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2">{r.waitingFor ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No milestones at risk.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
