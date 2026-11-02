import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { SeasonForm } from "../season-form";

export default async function NewSeasonPage() {
  const user = await requireUser();
  if (!can(user, "season.create")) redirect("/seasons");
  return (
    <div className="space-y-4">
      <PageHeader title="New season" description="Add a season to the master list" />
      <SeasonForm />
    </div>
  );
}