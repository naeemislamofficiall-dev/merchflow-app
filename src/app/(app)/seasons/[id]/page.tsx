import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { seasonService } from "@/services/season.service";
import { SeasonForm } from "../season-form";

export default async function EditSeasonPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await requireUser();
  if (!can(user, "season.edit")) redirect("/seasons");
  const season = await seasonService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  return (
    <div className="space-y-4">
      <PageHeader title={`Edit ${season.code}`} description="Change the season code or name" />
      <SeasonForm id={id} initial={{ code: season.code, name: season.name }} />
    </div>
  );
}