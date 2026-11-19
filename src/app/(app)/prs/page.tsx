import Link from "next/link";
import { Plus } from "lucide-react";
import { can, requireUser } from "@/lib/permissions";
import { CartArt, PageBand } from "@/components/approvals/ui";
import { PrsView, type PrRow } from "@/components/prs/prs-view";
import { prService } from "@/services/pr.service";
import { ReorderButton } from "./reorder-button";

const TZ = "Asia/Dhaka";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const timeOf = (d: Date) =>
  d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export default async function PrsPage() {
  const user = await requireUser();
  const prs = await prService.list();

  const rows: PrRow[] = prs.map((p) => {
    // header date na thakle line-er shobcheye ager required date
    const lineDates = p.lines
      .map((l) => l.requiredDate)
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime());
    const req = p.requiredDate ?? lineDates[0] ?? null;
    return {
      id: p.id,
      prNo: p.prNo,
      source: p.source,
      priority: p.priority,
      lines: p.lines.length,
      requiredDate: req ? req.toISOString().slice(0, 10) : null,
      createdKey: dayKey(p.createdAt),
      createdLabel: `${dayKey(p.createdAt)} ${timeOf(p.createdAt)}`,
      status: p.status,
    };
  });

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CartArt />
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Purchase requisitions</h1>
              <p className="text-sm text-slate-500">
                Requests to buy material, from MRP, reorder points or manual entry
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ReorderButton />
            <Link
              href="/prs/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New PR
            </Link>
          </div>
        </header>
      </PageBand>

      <PrsView rows={rows} canEdit={can(user, "pr.edit")} todayKey={dayKey(new Date())} />
    </div>
  );
}