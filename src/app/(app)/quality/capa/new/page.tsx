import { PageHeader } from "@/components/layout/page-header";
import { capaService } from "@/services/capa.service";
import { CapaForm } from "./capa-form";

export default async function NewCapaPage() {
  const users = await capaService.users().catch(() => []);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New CAPA" description="Describe the problem. You add the root cause and actions in the next steps" />
      <CapaForm users={users.map((u) => ({ id: u.id, label: u.name }))} />
    </div>
  );
}