import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { requireUser, can } from "@/lib/permissions";
import { poService } from "@/services/po.service";
import { createProformaInvoiceAction } from "./actions";

export default async function ProformaInvoicesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (!can(user, "po.view")) redirect("/dashboard");
  const [orders, rows, params] = await Promise.all([
    poService.list(),
    prisma.supplierPi.findMany({ where: { po: { companyId: user.companyId } }, include: { po: { select: { poNo: true } }, supplier: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    searchParams,
  ]);
  return <div className="space-y-5">
    <PageHeader title="Supplier proforma invoices" description="Register supplier PI against a purchase order; currency conversion snapshot and audit trail are handled by the PO service." />
    {params.saved === "1" && <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">Proforma invoice saved.</p>}
    <section className="rounded-xl border p-4"><h2 className="mb-3 font-semibold">Register PI</h2><form action={createProformaInvoiceAction} className="grid gap-3 md:grid-cols-3">
      <label className="grid gap-1 text-sm">Purchase order<select required name="poId" className="rounded-md border bg-background px-3 py-2"><option value="">Select PO</option>{orders.map((o)=><option key={o.id} value={o.id}>{o.poNo} · {o.supplier.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">PI number<input required name="piNo" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Amount<input required min="0.01" step="0.01" type="number" name="amount" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Currency<input required minLength={3} maxLength={3} defaultValue="USD" name="currency" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">PI date<input type="date" name="piDate" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Document URL<input type="url" name="fileUrl" className="rounded-md border bg-background px-3 py-2" placeholder="https://…" /></label>
      <div className="md:col-span-3"><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">Save PI</button></div>
    </form></section>
    <section className="space-y-3"><h2 className="font-semibold">Registered PIs</h2><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{["PI number","PO","Supplier","Date","Amount","Base amount","Document"].map(x=><th key={x} className="px-3 py-2 text-left font-medium">{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2">{r.piNo}</td><td className="px-3 py-2">{r.po?.poNo ?? "—"}</td><td className="px-3 py-2">{r.supplier.name}</td><td className="px-3 py-2">{r.piDate?.toISOString().slice(0,10) ?? "—"}</td><td className="px-3 py-2">{r.currency} {Number(r.amount).toLocaleString()}</td><td className="px-3 py-2">{r.baseAmount ? `${r.baseCurrency ?? ""} ${Number(r.baseAmount).toLocaleString()}` : "—"}</td><td className="px-3 py-2">{r.fileUrl ? <a className="underline" href={r.fileUrl} target="_blank" rel="noreferrer">Open</a> : "—"}</td></tr>)}{rows.length===0&&<tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No PIs registered yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
