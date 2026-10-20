import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { userService } from "@/services/user.service";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const me = await requireUser();
  if (!can(me, "user.create")) redirect("/admin/users");
  const { roles, factories } = await userService.options();
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="New user" description="Create a sign-in for a team member" />
      <UserForm roles={roles} factories={factories} />
    </div>
  );
}
