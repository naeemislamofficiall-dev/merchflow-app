import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, CirclePause, Plus, ShieldCheck, Users } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { ShieldArt } from "@/components/admin/users-art";
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

  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const admins = rows.filter((r) => r.role === "Admin").length;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Users className="h-8 w-8" strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Users</h1>
              <p className="text-sm text-slate-500">
                People who can sign in to this company and access the system
              </p>
            </div>
          </div>
          <ShieldArt className="pointer-events-none absolute -bottom-2 right-56 hidden h-28 lg:block" />
          {can(me, "user.create") && (
            <Link
              href="/admin/users/new"
              className="relative inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New User
            </Link>
          )}
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard big plain theme="blue" icon={Users} label="Total Users" value={String(rows.length)} sub="People who can sign in" />
        <StatCard big plain theme="green" icon={CircleCheck} label="Active Users" value={String(active)} sub="Status: Active" />
        <StatCard
          big
          plain
          theme="orange"
          icon={CirclePause}
          label="Inactive Users"
          value={String(rows.length - active)}
          sub="Status not Active"
        />
        <StatCard big plain theme="violet" icon={ShieldCheck} label="Admins" value={String(admins)} sub="Role: Admin" />
      </div>

      <UsersTable rows={rows} />
    </div>
  );
}