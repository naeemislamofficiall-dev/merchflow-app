import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { can, requireUser } from "@/lib/permissions";
import { roleService } from "@/services/role.service";

export default async function RolesPage() {
  const me = await requireUser();
  if (!can(me, "role.view")) redirect("/dashboard");
  const roles = await roleService.list();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="What each role is allowed to do. Roles are shared across all companies."
        actions={
          can(me, "role.manage") ? (
            <Link href="/admin/roles/new" className={buttonVariants()}>
              New role
            </Link>
          ) : undefined
        }
      />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/admin/roles/${r.id}`} className="font-medium text-denim-700 hover:underline">
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell>{r.description ?? "-"}</TableCell>
                <TableCell>{r.isAdmin ? <Badge variant="info">Full access</Badge> : r.permissionCount}</TableCell>
                <TableCell>{r.users}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
