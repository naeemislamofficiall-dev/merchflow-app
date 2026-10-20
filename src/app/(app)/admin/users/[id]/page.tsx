import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { userService } from "@/services/user.service";
import { UserForm } from "../user-form";
import { ResetPasswordForm } from "./reset-password-form";
import { ResetLinkCard } from "./reset-link-card";

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await requireUser();
  if (!can(me, "user.view")) redirect("/dashboard");

  const user = await userService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });
  if (!user) notFound();
  const { roles, factories } = await userService.options();
  const canEdit = can(me, "user.edit");

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title={user.name} description={`${user.email} · ${user.role.name}`} />
      {canEdit ? (
        <>
          <UserForm
            id={id}
            roles={roles}
            factories={factories}
            isSelf={me.id === id}
            initial={{
              name: user.name,
              email: user.email,
              roleId: user.roleId,
              scope: user.scope === "FACTORY" ? "FACTORY" : "COMPANY",
              factoryId: user.factoryId ?? "",
              status: user.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            }}
          />
          <ResetLinkCard id={id} />
          <ResetPasswordForm id={id} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">You can view this user but not edit.</p>
      )}
    </div>
  );
}
