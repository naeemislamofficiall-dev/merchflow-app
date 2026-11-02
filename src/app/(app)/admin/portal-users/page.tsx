import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { portalAdminService } from "@/services/portal-admin.service";
import { createPortalUserAction } from "./actions";

const input = "w-full rounded border px-2 py-1";

export default async function PortalUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireUser();
  if (!can(me, "portaluser.view")) redirect("/dashboard");
  const sp = await searchParams;
  const canCreate = can(me, "portaluser.create");
  const [rows, opts] = await Promise.all([
    portalAdminService.list(),
    canCreate ? portalAdminService.options() : Promise.resolve({ suppliers: [], buyers: [] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Portal users" description="Supplier and buyer users who can sign in to the portals" />
      {sp.ok && <p className="rounded bg-green-100 p-2 text-green-800">{sp.ok}</p>}
      {sp.err && <p className="rounded bg-red-100 p-2 text-red-800">{sp.err}</p>}

      {canCreate && (
        <form action={createPortalUserAction} className="max-w-xl space-y-3 rounded border p-4">
          <h2 className="font-semibold">New portal user</h2>
          <label className="block text-sm">
            Type
            <select name="type" className={input} defaultValue="SUPPLIER">
              <option value="SUPPLIER">Supplier</option>
              <option value="BUYER">Buyer</option>
            </select>
          </label>
          <label className="block text-sm">
            Supplier (when type is Supplier)
            <select name="supplierId" className={input} defaultValue="">
              <option value="">-</option>
              {opts.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Buyer (when type is Buyer)
            <select name="buyerId" className={input} defaultValue="">
              <option value="">-</option>
              {opts.buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </label>
          <input name="name" placeholder="Full name" required className={input} />
          <input name="email" type="email" placeholder="Email" required className={input} />
          <input name="password" type="password" placeholder="Initial password (min 6 characters)" required minLength={6} className={input} />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-white">Create portal user</button>
        </form>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Type</th><th className="p-2">Linked to</th><th className="p-2">Status</th><th className="p-2">Last login</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-2 text-gray-500" colSpan={6}>No portal users yet</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.user.name}</td>
                <td className="p-2">{r.user.email}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.supplier ? `${r.supplier.code} - ${r.supplier.name}` : r.buyer ? `${r.buyer.code} - ${r.buyer.name}` : "-"}</td>
                <td className="p-2">{r.user.status}</td>
                <td className="p-2">{r.user.lastLoginAt ? r.user.lastLoginAt.toISOString().slice(0, 16).replace("T", " ") : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}