import { PageHeader } from "@/components/layout/page-header";
import { styleService } from "@/services/style.service";
import { BomForm } from "./bom-form";

export default async function NewBomPage() {
  const styles = await styleService.list();
  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="New BOM" description="Start a draft BOM for a style" />
      <BomForm styles={styles.map((s) => ({ id: s.id, label: `${s.styleNo} - ${s.name}` }))} />
    </div>
  );
}