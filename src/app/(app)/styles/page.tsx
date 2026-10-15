import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { styleService } from "@/services/style.service";
import { StylesTable, type StyleRow } from "./styles-table";

export default async function StylesPage() {
  const styles = await styleService.list();

  const rows: StyleRow[] = styles.map((s) => ({
    id: s.id,
    styleNo: s.styleNo,
    name: s.name,
    buyer: s.buyer.name,
    category: s.category ?? "",
    season: s.season ?? "",
    status: s.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Styles"
        description="Technical identity of every garment"
        actions={
          <Link href="/styles/new" className={buttonVariants()}>
            New style
          </Link>
        }
      />
      <StylesTable rows={rows} />
    </div>
  );
}