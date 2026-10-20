import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { userService } from "@/services/user.service";
import { UsersTable, type UserRow } from "./users-table";

export default async function UsersPage() {
  const me = await requireUser();
  if (!can(me, "user.view")) redirect("/dashboard");
  const users = await userService.list();

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
    access: u.scope === "FACTORY" ? `Factory: ${u.factory?.name ?? "-"}` : u.scope.charAt(0) + u.scope.slice(1).toLowerCase(),
    lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "Never",
    status: u.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="People who can sign in to this company"
        actions={
          can(me, "user.create") ? (
            <Link href="/admin/users/new" className={buttonVariants()}>
              New user
            </Link>
          ) : undefined
        }
      />
      <UsersTable rows={rows} />
    </div>
  );
}
