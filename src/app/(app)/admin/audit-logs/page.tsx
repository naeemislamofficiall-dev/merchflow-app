import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  ListChecks,
  Mail,
  RotateCcw,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { AuditArt } from "@/components/admin/audit-art";
import { can, requireUser } from "@/lib/permissions";
import { auditService } from "@/services/audit.service";

const TZ = "Asia/Dhaka";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const nf = new Intl.NumberFormat("en-US");

type Search = { entity?: string; action?: string; actor?: string; from?: string; to?: string; page?: string };

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED", "PASSWORD_RESET_REQUESTED"];

const ACTION_STYLE: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-rose-100 text-rose-700",
  LOGIN: "bg-orange-100 text-orange-700",
  LOGIN_FAILED: "bg-red-100 text-red-700",
  PASSWORD_RESET_REQUESTED: "bg-amber-100 text-amber-700",
};

const HEAD = ["Date & time", "Entity", "Action", "User", "Reason", "IP address", "Details"];

const field =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-normal text-ink shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

const when = (d: Date) =>
  d
    .toLocaleString("en-CA", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");

function fmt(v: unknown) {
  return v === null || v === undefined ? "" : JSON.stringify(v, null, 2);
}

// 1 2 3 ... 125 moto page list
function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [...new Set([1, pages, page - 1, page, page + 1, ...(page <= 2 ? [2, 3] : [])])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  return keep.flatMap<number | "gap">((n, i) => (i > 0 && n - keep[i - 1] > 1 ? ["gap", n] : [n]));
}

function IconField({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      {children}
    </div>
  );
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireUser();
  if (!can(me, "audit.view")) redirect("/dashboard");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = sp.from && DATE.test(sp.from) ? sp.from : "";
  const to = sp.to && DATE.test(sp.to) ? sp.to : "";

  const { rows, total, pages } = await auditService.list({
    entity: sp.entity?.trim() || undefined,
    action: sp.action || undefined,
    actor: sp.actor?.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
  });

  const href = (p: number) => {
    const q = new URLSearchParams();
    if (sp.entity) q.set("entity", sp.entity);
    if (sp.action) q.set("action", sp.action);
    if (sp.actor) q.set("actor", sp.actor);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    q.set("page", String(p));
    return `/admin/audit-logs?${q.toString()}`;
  };

  const users = new Set(rows.map((r) => r.actor?.email).filter(Boolean)).size;
  const nav = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold";

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <FileCheck className="h-8 w-8" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Audit Log</h1>
            <p className="text-sm text-slate-500">Track all activities and changes across the system</p>
          </div>
          <AuditArt className="pointer-events-none absolute -bottom-3 right-0 hidden h-32 lg:block" />
        </header>
      </PageBand>

      <form
        key={[sp.entity, sp.action, sp.actor, from, to].join("|")}
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <label className="grid min-w-44 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          Entity
          <IconField icon={Layers}>
            <input name="entity" defaultValue={sp.entity ?? ""} placeholder="e.g. Supplier" className={field} />
          </IconField>
        </label>
        <label className="grid min-w-44 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          Action
          <IconField icon={Zap}>
            <select name="action" defaultValue={sp.action ?? ""} className={field}>
              <option value="">All Actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </IconField>
        </label>
        <label className="grid min-w-52 flex-1 gap-1.5 text-sm font-semibold text-navy-800">
          User Email
          <IconField icon={Mail}>
            <input name="actor" defaultValue={sp.actor ?? ""} placeholder="Enter user email..." className={field} />
          </IconField>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          From
          <IconField icon={CalendarDays}>
            <input type="date" name="from" defaultValue={from} className={cn(field, "w-44")} />
          </IconField>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-navy-800">
          To
          <IconField icon={CalendarDays}>
            <input type="date" name="to" defaultValue={to} className={cn(field, "w-44")} />
          </IconField>
        </label>
        <div className="ml-auto flex gap-3">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Filter className="h-4 w-4" strokeWidth={2.5} /> Filter
          </button>
          <Link
            href="/admin/audit-logs"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-800 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Link>
        </div>
      </form>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          big
          plain
          theme="blue"
          icon={FileText}
          label="Total Logs"
          value={nf.format(total)}
          sub="Matching the current filters"
        />
        <StatCard
          big
          plain
          theme="green"
          icon={ListChecks}
          label="Shown on this page"
          value={nf.format(rows.length)}
          sub={`Page ${page} of ${pages}`}
        />
        <StatCard
          big
          plain
          theme="violet"
          icon={Users}
          label="Users on this page"
          value={nf.format(users)}
          sub="Distinct users in these rows"
        />
      </div>

      <section className="rounded-card border border-slate-100 bg-white shadow-card">
        <h2 className="flex items-center gap-2.5 px-6 pt-5 font-heading text-xl font-semibold text-navy-800">
          <Clock className="h-5 w-5 text-blue-600" /> Audit Logs
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {HEAD.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top transition-colors hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-4 py-3">{when(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {r.entity}{" "}
                    <span className="font-mono text-xs text-slate-400">{r.entityId.slice(0, 10)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold",
                        ACTION_STYLE[r.action] ?? "bg-slate-100 text-slate-700"
                      )}
                    >
                      {r.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.actor?.email ?? "-"}</td>
                  <td className="px-4 py-3">{r.reason ?? ""}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{r.ip ?? ""}</td>
                  <td className="px-4 py-3">
                    {r.before || r.after ? (
                      <details>
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                          <Eye className="h-4 w-4" /> View
                        </summary>
                        {r.before ? (
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs">
                            Before: {fmt(r.before)}
                          </pre>
                        ) : null}
                        {r.after ? (
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs">
                            After: {fmt(r.after)}
                          </pre>
                        ) : null}
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={HEAD.length} className="px-4 py-10 text-center text-slate-500">
                    No audit records match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="text-sm font-medium text-navy-800">
            {nf.format(total)} records · Page {page} of {pages}
          </span>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link href={href(page - 1)} className={cn(nav, "border border-slate-200 text-navy-800 hover:bg-slate-50")}>
                Previous
              </Link>
            ) : (
              <span className={cn(nav, "bg-slate-50 text-slate-400")}>Previous</span>
            )}
            {pageList(page, pages).map((n, i) =>
              n === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={href(n)}
                  className={cn(
                    nav,
                    n === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-navy-800 hover:bg-slate-50"
                  )}
                >
                  {n}
                </Link>
              )
            )}
            {page < pages ? (
              <Link href={href(page + 1)} className={cn(nav, "border border-slate-200 text-navy-800 hover:bg-slate-50")}>
                Next
              </Link>
            ) : (
              <span className={cn(nav, "bg-slate-50 text-slate-400")}>Next</span>
            )}
          </nav>
        </div>
      </section>
    </div>
  );
}