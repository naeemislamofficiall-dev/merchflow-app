import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BusinessRuleError } from "@/lib/business-rules";
import { can, requireUser } from "@/lib/permissions";
import { roleService } from "@/services/role.service";
import { RoleForm } from "../role-form";
import { permissionGroups } from "../groups";

export default async function RoleDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await requireUser();
  if (!can(me, "role.view")) redirect("/dashboard");

  const role = await roleService.get(id).catch((e) => {
    if (e instanceof BusinessRuleError) notFound();
    throw e;
  });

  const locked = role.isAdmin || role.id === me.roleId;
  const readOnly = !can(me, "role.manage") || locked;
  const note = role.isAdmin
    ? "The admin role has full access and cannot be edited."
    : role.id === me.roleId
      ? "You cannot edit your own role."
      : undefined;

  return (
    <div className="space-y-4">
      <PageHeader title={role.name} description={note ?? "Tick what this role is allowed to do"} />
      {role.isAdmin ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">Full access to every module.</p>
      ) : (
        <RoleForm
          id={id}
          initial={{ name: role.name, description: role.description, keys: role.keys }}
          groups={permissionGroups()}
          grantable={me.permissions}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
