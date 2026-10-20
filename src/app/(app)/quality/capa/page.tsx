import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { capaService } from "@/services/capa.service";
import { CapaTable, type CapaRow } from "./capa-table";

export default async function CapaPage() {
  const [list, pending] = await Promise.all([capaService.list(), capaService.pending()]);
  const now = new Date();

  const rows: CapaRow[] = list.map((c) => ({
    id: c.id,
    capaNo: c.capaNo,
    title: c.title,
    category: c.category ?? "",
    dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : "",
    overdue: !!c.dueDate && c.dueDate < now && c.status !== "CLOSED" && c.status !== "CANCELLED",
    status: c.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="CAPA"
        description="Find the root cause of a quality problem, fix it, and prove the fix worked"
        actions={
          <Link href="/quality/capa/new" className={buttonVariants()}>
            New CAPA
          </Link>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-semibold">{pending.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-semibold">{pending.overdue}</p>
          </CardContent>
        </Card>
      </div>
      <CapaTable rows={rows} />
    </div>
  );
}