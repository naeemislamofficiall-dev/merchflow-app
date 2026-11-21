import Link from "next/link";
import { Filter, Handshake, ListFilter, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { StatusBadge } from "@/components/detail/status-badge";
import { subcontractService } from "@/services/subcontract.service";

const STATUSES = ["SENT", "VENDOR_RECEIVED", "IN_PROCESS", "RETURNED", "QC_DONE", "CLOSED", "CANCELLED"] as const;
const day = (d: Date) => d.toISOString().slice(0, 10);
const n = (v: number) => v.toLocaleString("en-US");

const field =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

// SHUDHU SAJANO: sewing machine (data na). Chaile function ar <MachineArt /> line ta muche dao
function MachineArt() {
  return (
    <svg viewBox="0 0 160 90" className="h-24 w-44" aria-hidden="true">
      <rect x="4" y="80" width="116" height="8" rx="4" fill="#1e3a8a" />
      <path d="M14 80 V40 Q14 18 40 18 H88 Q104 18 104 34 V44 H78 V80 Z" fill="#1e3a8a" />
      <rect x="86" y="8" width="12" height="12" rx="2" fill="#1e3a8a" />
      <circle cx="46" cy="38" r="8" fill="#93c5fd" />
      <rect x="98" y="44" width="4" height="22" rx="2" fill="#1e3a8a" />
      <rect x="128" y="56" width="22" height="24" rx="4" fill="#bfdbfe" />
      <rect x="128" y="62" width="22" height="4" fill="#60a5fa" />
      <rect x="128" y="70" width="22" height="4" fill="#60a5fa" />
    </svg>
  );
}

// SHUDHU SAJANO: handshake + clipboard (data na)
function EmptyArt() {
  return (
    <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-blue-600 shadow-card">
        <Handshake className="h-10 w-10" strokeWidth={2} />
      </span>
    </span>
  );
}

export default async function SubcontractPage(props: {
  searchParams: Promise<{ status?: string; overdue?: string }>;
}) {
  const sp = await props.searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const overdueOnly = sp.overdue === "1";

  const list = await subcontractService.list({ ...(status ? { status } : {}), overdueOnly });

  const heads = ["Subcontract", "Vendor", "Process", "Production Order", "Sent", "Balance", "Due", "Status"];

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Handshake className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Subcontract</h1>
              <p className="text-sm text-slate-500">
                Goods sent outside for printing, embroidery or washing, and what comes back
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <MachineArt />
            </div>
            <Link
              href="/subcontract/new"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Send Goods
            </Link>
          </div>
        </header>
      </PageBand>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-card border border-slate-100 bg-white p-5 shadow-card"
      >
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-semibold text-navy-800">
            Status
          </label>
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            <select id="status" name="status" defaultValue={status ?? ""} className={`${field} min-w-48 pl-10`}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex h-11 items-center gap-2 text-sm font-semibold text-navy-800">
          <input type="checkbox" name="overdue" value="1" defaultChecked={overdueOnly} className="h-4 w-4" />
          Overdue only
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
        >
          <Filter className="h-4 w-4" /> Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-navy-800">
              <tr>
                {heads.map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold uppercase tracking-wide ${
                      i === 4 || i === 5 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {list.length > 0 && (
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3.5 text-[15px] font-semibold">
                      <Link href={`/subcontract/${s.id}`} className="text-blue-700 hover:underline">
                        {s.subcontractNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{s.vendor.name}</td>
                    <td className="px-4 py-3.5 text-[15px] capitalize text-navy-800">{s.process.toLowerCase()}</td>
                    <td className="px-4 py-3.5 text-[15px] text-navy-800">{s.productionOrder.productionNo}</td>
                    <td className="px-4 py-3.5 text-right text-[15px] tabular-nums text-navy-800">{n(s.sentQty)}</td>
                    <td className="px-4 py-3.5 text-right text-[15px] tabular-nums text-navy-800">
                      {n(s.balanceQty)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3.5 text-[15px] ${
                        s.isOverdue ? "font-semibold text-red-600" : "text-navy-800"
                      }`}
                    >
                      {day(s.dueDate)}
                      {s.isOverdue ? " (late)" : ""}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {list.length === 0 && (
          <div className="flex flex-col items-center border-t border-slate-100 px-4 py-10 text-center">
            <EmptyArt />
            <h2 className="mt-3 font-heading text-xl font-semibold text-navy-800">No Subcontract Orders Found</h2>
            <p className="mt-1 text-sm text-slate-600">Please adjust your filters or send goods for a new subcontract.</p>
            <Link
              href="/subcontract/new"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Create Subcontract
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}