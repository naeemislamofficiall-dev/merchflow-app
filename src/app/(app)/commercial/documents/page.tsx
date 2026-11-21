import Link from "next/link";
import { FilePlus, FileText, Plus } from "lucide-react";
import { PageBand } from "@/components/approvals/ui";
import { FolderArt, ShipArt } from "@/components/commercial/export-art";
import { StatusBadge } from "@/components/detail/status-badge";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { resolveScope } from "@/lib/scope";
import { DOC_TYPE_LABEL } from "@/lib/export-doc-types";
import { DocForm } from "./doc-form";
import { DocActions } from "./doc-actions";

const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

const HEAD = ["Type", "Doc no", "Shipment", "Issue date", "Amount", "Status", "Handed over", "Action"];

export default async function DocumentsPage() {
  const user = await requirePermission("shipping.view");
  const scope = await resolveScope(user.id);

  const [docs, shipments] = await Promise.all([
    prisma.exportDocument.findMany({
      where: { companyId: user.companyId! },
      include: { shipment: { select: { shipmentNo: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.shipment.findMany({
      where: { companyId: user.companyId!, factoryId: { in: scope.factoryIds } },
      select: { id: true, shipmentNo: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="relative flex min-h-24 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white text-blue-600 shadow-card">
            <FilePlus className="h-8 w-8" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Export documents</h1>
            <p className="text-sm text-slate-500">Commercial invoice, packing list, BL and other shipping documents</p>
          </div>
          <ShipArt className="pointer-events-none absolute -bottom-4 right-0 hidden h-32 md:block" />
        </header>
      </PageBand>

      <DocForm shipments={shipments.map((s) => ({ id: s.id, label: s.shipmentNo }))} />

      <section className="rounded-card border border-slate-100 bg-white shadow-card">
        <div className="flex items-center gap-3 px-6 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-navy-800">Documents</h2>
            <p className="text-sm text-slate-500">Manage your exported documents</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50/70">
              <tr>
                {HEAD.map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-800 ${
                      h === "Amount" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-3">{(DOC_TYPE_LABEL as Record<string, string>)[d.docType] ?? d.docType}</td>
                  <td className="px-4 py-3 font-medium text-navy-800">{d.docNo ?? "-"}</td>
                  <td className="px-4 py-3">{d.shipment?.shipmentNo ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(d.issueDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {d.amount
                      ? `${d.currency ?? ""} ${Number(d.amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3">{d.handoverTo ? `${d.handoverTo} (${fmtDate(d.handoverDate)})` : "-"}</td>
                  <td className="px-4 py-3">
                    <DocActions id={d.id} status={d.status} />
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={HEAD.length} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <FolderArt className="mb-2 h-20 w-20 animate-float" />
                      <p className="text-lg font-semibold text-navy-800">No documents yet</p>
                      <p className="text-sm text-slate-500">Add your first document to get started.</p>
                      <Link
                        href="#add-document"
                        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border-2 border-blue-600 px-6 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Document
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}