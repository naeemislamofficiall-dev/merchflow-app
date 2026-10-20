import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { RoleForm } from "../role-form";
import { permissionGroups } from "../groups";

export default async function NewRolePage() {
  const me = await requireUser();
  if (!can(me, "role.manage")) redirect("/admin/roles");
  return (
    <div className="space-y-4">
      <PageHeader title="New role" description="Choose what this role can do" />
      <RoleForm groups={permissionGroups()} grantable={me.permissions} />
    </div>
  );
}
