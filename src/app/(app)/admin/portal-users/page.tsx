import { redirect } from "next/navigation";
import { Building2, Lock, Mail, ShieldCheck, ShoppingCart, User, UserPlus, Users } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { portalAdminService } from "@/services/portal-admin.service";
import { createPortalUserAction } from "./actions";
import { PortalUsersTable, type PortalRow } from "./portal-users-table";

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const lbl = "block text-sm font-semibold text-navy-800";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function PortalUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "portaluser.view")) redirect("/dashboard");
  const sp = await searchParams;
  const canCreate = can(me, "portaluser.create");
  const [list, opts] = await Promise.all([
    portalAdminService.list(),
    canCreate ? portalAdminService.options() : Promise.resolve({ suppliers: [], buyers: [] }),
  ]);

  const rows: PortalRow[] = list.map((r) => ({
    id: r.id,
    name: r.user.name,
    email: r.user.email,
    type: r.type,
    linked: r.supplier
      ? `${r.supplier.code} - ${r.supplier.name}`
      : r.buyer
        ? `${r.buyer.code} - ${r.buyer.name}`
        : "-",
    status: String(r.user.status),
    lastLogin: r.user.lastLoginAt ? fmt(r.user.lastLoginAt) : "Never",
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <Users className="h-8 w-8" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Portal Users</h1>
            <p className="text-sm text-slate-500">Supplier and buyer users who can sign in to the portals</p>
          </div>
        </header>
      </PageBand>

      {sp.ok && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {sp.ok}
        </p>
      )}
      {sp.err && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {sp.err}
        </p>
      )}

      {canCreate && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            action={createPortalUserAction}
            className="space-y-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-navy-800">Create Portal User</h2>
                <p className="text-xs text-slate-500">Add a new supplier or buyer portal user</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1">
                <span className={lbl}>Name *</span>
                <span className="relative block">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input name="name" required placeholder="Enter full name" className={field} />
                </span>
              </label>
              <label className="space-y-1">
                <span className={lbl}>Email *</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input name="email" type="email" required placeholder="user@company.com" className={field} />
                </span>
              </label>
              <label className="space-y-1">
                <span className={lbl}>Type *</span>
                <span className="relative block">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select name="type" defaultValue="SUPPLIER" className={field}>
                    <option value="SUPPLIER">Supplier</option>
                    <option value="BUYER">Buyer</option>
                  </select>
                </span>
              </label>
              <label className="space-y-1">
                <span className={lbl}>Supplier (when type is Supplier)</span>
                <span className="relative block">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select name="supplierId" defaultValue="" className={field}>
                    <option value="">Select supplier</option>
                    {opts.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="space-y-1">
                <span className={lbl}>Buyer (when type is Buyer)</span>
                <span className="relative block">
                  <ShoppingCart className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select name="buyerId" defaultValue="" className={field}>
                    <option value="">Select buyer</option>
                    {opts.buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="space-y-1">
                <span className={lbl}>Initial password (min 6 characters)</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter password"
                    className={field}
                  />
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <UserPlus className="h-4 w-4" /> Create portal user
            </button>
          </form>

          <aside className="space-y-4 rounded-card border border-blue-100 bg-blue-50/60 p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-navy-800">
              <ShieldCheck className="h-5 w-5 text-blue-600" /> Portal User Types
            </h2>
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <ShoppingCart className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-navy-800">Buyer</p>
                <p className="text-sm text-slate-600">
                  Sees its own orders, samples (and can approve or reject), styles, shipments and T&amp;A.
                </p>
              </div>
            </div>
            <div className="flex gap-3 border-t border-blue-100 pt-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-navy-800">Supplier</p>
                <p className="text-sm text-slate-600">
                  Answers RFQs with quotations, confirms POs, uploads documents, posts shipment updates and sees its
                  invoices.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <PortalUsersTable rows={rows} />
    </div>
  );
}