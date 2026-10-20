import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { can, requireUser } from "@/lib/permissions";
import { auditService } from "@/services/audit.service";

type Search = { entity?: string; action?: string; actor?: string; page?: string };

function fmt(v: unknown) {
  return v === null || v === undefined ? "" : JSON.stringify(v, null, 2);
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireUser();
  if (!can(me, "audit.view")) redirect("/dashboard");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await auditService.list({
    entity: sp.entity?.trim() || undefined,
    action: sp.action || undefined,
    actor: sp.actor?.trim() || undefined,
    page,
  });

  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (sp.entity) q.set("entity", sp.entity);
    if (sp.action) q.set("action", sp.action);
    if (sp.actor) q.set("actor", sp.actor);
    q.set("page", String(p));
    return `/admin/audit-logs?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" description={`${total} recorded changes. Newest first.`} />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="entity">Entity</label>
          <Input id="entity" name="entity" defaultValue={sp.entity ?? ""} placeholder="e.g. Supplier" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="action">Action</label>
          <Select id="action" name="action" defaultValue={sp.action ?? ""}>
            <option value="">All</option>
            {["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED", "PASSWORD_RESET_REQUESTED"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="actor">User email</label>
          <Input id="actor" name="actor" defaultValue={sp.actor ?? ""} placeholder="name@company.com" />
        </div>
        <Button type="submit" variant="outline">Filter</Button>
        <Link href="/admin/audit-logs" className="px-2 text-sm text-muted-foreground hover:underline">Clear</Link>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {["When", "User", "Action", "Entity", "Reason", "IP", "Details"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap px-3 py-2">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2">{r.actor?.email ?? "-"}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">
                  {r.entity} <span className="font-mono text-xs text-muted-foreground">{r.entityId.slice(0, 10)}</span>
                </td>
                <td className="px-3 py-2">{r.reason ?? ""}</td>
                <td className="px-3 py-2">{r.ip ?? ""}</td>
                <td className="px-3 py-2">
                  {r.before || r.after ? (
                    <details>
                      <summary className="cursor-pointer text-denim-700">View</summary>
                      {r.before ? (
                        <pre className="mt-1 max-w-md overflow-x-auto rounded bg-muted p-2 text-xs">Before: {fmt(r.before)}</pre>
                      ) : null}
                      {r.after ? (
                        <pre className="mt-1 max-w-md overflow-x-auto rounded bg-muted p-2 text-xs">After: {fmt(r.after)}</pre>
                      ) : null}
                    </details>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No audit records match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Page {page} of {pages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={qs(page - 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>}
          {page < pages && <Link href={qs(page + 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>}
        </div>
      </div>
    </div>
  );
}
