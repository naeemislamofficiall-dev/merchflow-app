import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sun } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { seasonService } from "@/services/season.service";
import { SeasonsTable, type SeasonRow } from "./seasons-table";

export default async function SeasonsPage() {
  const user = await requireUser();
  if (!can(user, "season.view")) redirect("/dashboard");
  const seasons = await seasonService.list();
  const canCreate = can(user, "season.create");
  const canEdit = can(user, "season.edit");

  const rows: SeasonRow[] = seasons.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    styles: s._count.styles,
    orders: s._count.orders,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-22 w-22 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 shadow-lg shadow-blue-200/60 ring-1 ring-white">
              <Sun className="h-10 w-10" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Seasons</h1>
              <p className="text-sm text-navy-800">Season master used by styles and orders</p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/seasons/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New Season
            </Link>
          )}
        </header>
      </PageBand>

      <SeasonsTable rows={rows} canEdit={canEdit} />
    </div>
  );
}