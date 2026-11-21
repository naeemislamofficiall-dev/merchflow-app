import { CalendarClock, FileSearch, FileText, Plus, TriangleAlert } from "lucide-react";
import { PageBand, StatCard } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { documentService } from "@/services/document.service";
import { DeleteButton } from "./delete-button";
import { RegisterForm } from "./register-form";

type Doc = Awaited<ReturnType<typeof documentService.list>>[number];

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";
const th = "whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide";
const td = "px-4 py-3.5 text-[15px] text-navy-800";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

function ExpiryChip({ date, now }: { date: Date | null; now: number }) {
  if (!date) return <span>-</span>;
  const left = Math.ceil((date.getTime() - now) / 86_400_000);
  const [cls, text] =
    left < 0
      ? ["bg-red-100 text-red-700", `expired ${-left}d ago`]
      : left <= 30
        ? ["bg-amber-100 text-amber-700", `${left} days left`]
        : ["bg-slate-100 text-slate-700", day(date)];
  return <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-semibold", cls)}>{text}</span>;
}

function DocTable({ docs, canDelete, empty, now }: { docs: Doc[]; canDelete: boolean; empty: string; now: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-navy-800">
          <tr>
            <th className={th}>Name</th>
            <th className={th}>Kind</th>
            <th className={th}>Belongs To</th>
            <th className={th}>Ver.</th>
            <th className={th}>Access</th>
            <th className={th}>Expiry</th>
            {canDelete && <th className={th} />}
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr className="border-t border-slate-100">
              <td colSpan={canDelete ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    {d.storageUrl ? (
                      <a
                        href={d.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {d.fileName}
                      </a>
                    ) : (
                      <span className="font-semibold">{d.fileName}</span>
                    )}
                  </span>
                </td>
                <td className={td}>{d.docType ?? "-"}</td>
                <td className={td}>
                  {d.entityType}
                  <span className="block max-w-40 truncate text-xs text-slate-500">{d.entityId}</span>
                </td>
                <td className={td}>v{d.version}</td>
                <td className={`${td} capitalize`}>{d.access.toLowerCase()}</td>
                <td className={td}>
                  <ExpiryChip date={d.expiryDate} now={now} />
                </td>
                {canDelete && (
                  <td className={td}>
                    <DeleteButton id={d.id} />
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function DocumentsPage(props: {
  searchParams: Promise<{ days?: string; entityType?: string; entityId?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const now = new Date().getTime();

  if (!can(user, "document.view")) {
    return <p className="text-sm text-muted-foreground">Your role cannot view documents.</p>;
  }

  const days = Math.min(365, Math.max(1, Number(sp.days) || 30));
  const expiring = await documentService.listExpiring(days);
  const type = sp.entityType?.trim();
  const eid = sp.entityId?.trim();
  const lookup = type && eid ? await documentService.list(type, eid) : null;
  const canDelete = can(user, "document.delete");
  const expiredCount = expiring.filter((d) => d.expiryDate && d.expiryDate.getTime() < now).length;

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <FileText className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Documents</h1>
              <p className="text-sm text-slate-500">
                Certificates and contracts: what is about to expire, and everything filed against a record
              </p>
            </div>
          </div>
          {can(user, "document.upload") && (
            <a
              href="#register-document"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Document
            </a>
          )}
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <StatCard
          theme="orange"
          icon={CalendarClock}
          label={`Expiring in ${days} Days`}
          value={expiring.length}
          sub="Including already expired"
        />
        <StatCard
          theme={expiredCount > 0 ? "red" : "green"}
          icon={TriangleAlert}
          label="Already Expired"
          value={expiredCount}
          sub={`Within the ${days}-day window list`}
        />
      </div>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        <div className="bg-navy-800 px-5 py-3.5 text-white">
          <h2 className="font-heading text-lg font-semibold">Expiring within {days} days</h2>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3 p-5">
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">Days ahead</span>
            <input name="days" type="number" min={1} max={365} defaultValue={days} className={`${field} w-32`} />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            Update
          </button>
        </form>
        <DocTable docs={expiring} canDelete={canDelete} empty="Nothing is expiring in this window" now={now} />
      </div>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
          <FileSearch className="h-5 w-5 text-blue-600" />
          <h2 className="font-heading text-lg font-semibold text-navy-800">Find Documents of a Record</h2>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3 p-5">
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">Belongs to</span>
            <input name="entityType" defaultValue={type ?? ""} placeholder="Supplier" className={`${field} w-56`} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-semibold text-navy-800">Record id</span>
            <input name="entityId" defaultValue={eid ?? ""} className={`${field} w-72`} />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            Find
          </button>
        </form>
        {lookup && <DocTable docs={lookup} canDelete={canDelete} empty="No documents for this record" now={now} />}
      </div>

      {can(user, "document.upload") && <RegisterForm />}
    </div>
  );
}