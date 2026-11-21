import { redirect } from "next/navigation";
import { Plus, Truck } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { can, requireUser } from "@/lib/permissions";
import { shipmentService } from "@/services/shipment.service";
import { saveForwarderAction } from "./actions";
import { ForwardersTable, type ForwarderRow } from "./forwarders-table";

const input =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/20";

export default async function ForwardersPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (!can(user, "shipment.view")) redirect("/dashboard");
  const [list, params] = await Promise.all([shipmentService.listForwarders(), searchParams]);

  const rows: ForwarderRow[] = list.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    contactName: r.contactName ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    isActive: r.isActive,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
              <Truck className="h-8 w-8" strokeWidth={2.2} />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Forwarders</h1>
              <p className="text-sm text-slate-500">
                Manage freight forwarder master data used by export shipments.
              </p>
            </div>
          </div>
          <a
            href="#add-forwarder"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Forwarder
          </a>
        </header>
      </PageBand>

      {params.saved === "1" && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Forwarder saved.
        </p>
      )}

      <ForwardersTable rows={rows} canAdd />

      <section
        id="add-forwarder"
        className="scroll-mt-6 overflow-hidden rounded-card border border-slate-100 bg-white shadow-card"
      >
        <div className="bg-navy-800 px-5 py-3.5 text-white">
          <h2 className="font-heading text-lg font-semibold">Add Forwarder</h2>
        </div>
        <form action={saveForwarderAction} className="grid gap-4 p-5 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold text-navy-800">
            Code
            <input required name="code" className={input} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-navy-800">
            Company name
            <input required name="name" className={input} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-navy-800">
            Contact name
            <input name="contactName" className={input} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-navy-800">
            Phone
            <input name="phone" className={input} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-navy-800">
            Email
            <input type="email" name="email" className={input} />
          </label>
          <div className="flex items-end">
            <button className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5">
              Save forwarder
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}