import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ShieldCheck, Shield, UserCheck, Users } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { PeopleArt } from "@/components/admin/users-art";
import { can, requireUser } from "@/lib/permissions";
import { roleService } from "@/services/role.service";
import { RolesTable, type RoleRow } from "./roles-table";

export default async function RolesPage() {
  const me = await requireUser();
  if (!can(me, "role.view")) redirect("/dashboard");
  const roles = await roleService.list();
  const canManage = can(me, "role.manage");

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "-",
    isAdmin: r.isAdmin,
    permissionCount: r.permissionCount,
    users: r.users,
    canManage,
  }));

  const fullAccess = rows.filter((r) => r.isAdmin).length;
  const assigned = rows.reduce((s, r) => s + r.users, 0);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Shield className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Roles</h1>
              <p className="text-sm text-slate-500">
                What each role is allowed to do. Roles are shared across all companies.
              </p>
            </div>
          </div>
          <PeopleArt className="pointer-events-none absolute -bottom-2 right-56 hidden h-28 lg:block" />
          {canManage && (
            <Link
              href="/admin/roles/new"
              className="relative inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New Role
            </Link>
          )}
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard big plain theme="blue" icon={Users} label="Total Roles" value={String(rows.length)} sub="Shared across all companies" />
        <StatCard big plain theme="violet" icon={ShieldCheck} label="Full access roles" value={String(fullAccess)} sub="Admin access to everything" />
        <StatCard big plain theme="green" icon={UserCheck} label="Users assigned" value={String(assigned)} sub="Across all roles" />
      </div>

      <RolesTable rows={rows} />
    </div>
  );
}