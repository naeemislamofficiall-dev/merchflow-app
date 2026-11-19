import Link from "next/link";
import { CalendarDays, CircleCheck, FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { apService } from "@/services/ap.service";
import { getBaseCurrency } from "@/services/currency.service";
import { CardArt, PageBand, StatCard } from "@/components/approvals/ui";
import { PayablesView, type PayRow } from "@/components/payables/payables-view";

const TZ = "Asia/Dhaka";
const LIVE = ["POSTED", "PARTIALLY_PAID"];
const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PayablesPage() {
  const user = await requireUser();

  let invoices: Awaited<ReturnType<typeof apService.list>> | null = null;
  try {
    invoices = await apService.list();
  } catch {
    invoices = null; // ap.view permission nei
  }
  if (!invoices) return <p className="text-muted-foreground">You do not have access to payables.</p>;

  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: TZ });
  const monthKey = todayKey.slice(0, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [suppliers, payments, base] = await Promise.all([
    prisma.supplier.findMany({
      where: { id: { in: [...new Set(invoices.map((i) => i.supplierId))] } },
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { companyId: user.companyId, direction: "OUT", paymentDate: { gte: monthStart } },
      select: { amount: true, supplierInvoiceId: true },
    }),
    getBaseCurrency(user.companyId),
  ]);

  const rate = new Map(invoices.map((i) => [i.id, Number(i.exchangeRate)]));
  const paidThisMonth = payments.reduce(
    (s, p) => s + Number(p.amount) * (rate.get(p.supplierInvoiceId ?? "") ?? 1),
    0
  );

  const rows: (PayRow & { outstandingBase: number })[] = invoices.map((i) => {
    const status = String(i.status);
    const live = LIVE.includes(status);
    const dueKey = i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null;
    return {
      id: i.id,
      invoiceNo: i.invoiceNo,
      supplier: suppliers.find((s) => s.id === i.supplierId)?.name ?? "-",
      supplierInvoiceNo: i.supplierInvoiceNo,
      total: Number(i.totalAmount),
      paid: Number(i.paidAmount),
      currency: i.currency,
      due: dueKey,
      status,
      overdue: live && !!dueKey && dueKey < todayKey,
      dueThisMonth: live && !!dueKey && dueKey.startsWith(monthKey),
      outstandingBase: (Number(i.totalAmount) - Number(i.paidAmount)) * Number(i.exchangeRate),
    };
  });

  const overdueRows = rows.filter((r) => r.overdue);
  const overdueCount = overdueRows.length;
  const overdueAmount = overdueRows.reduce((s, r) => s + r.outstandingBase, 0);
  const dueMonthAmount = rows.filter((r) => r.dueThisMonth).reduce((s, r) => s + r.outstandingBase, 0);

  const canCreate = can(user, "ap.create");

  
  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardArt />
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Payables</h1>
              <p className="text-sm text-slate-500">Supplier invoices, match with PO, post, then pay</p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/finance/payables/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New Supplier Invoice
            </Link>
          )}
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <StatCard
          big
          wave
          theme="pink"
          icon={FileText}
          label="Overdue Invoices"
          value={String(overdueCount)}
          sub={overdueCount > 0 ? `${fmt2.format(overdueAmount)} ${base} overdue` : "Nothing overdue"}
        />
        <StatCard
          big
          wave
          theme="green"
          icon={CalendarDays}
          label="Due This Month"
          value={fmt2.format(dueMonthAmount)}
          unit={base}
          sub="Still to pay this month"
        />
        <StatCard
          big
          wave
          theme="violet"
          icon={CircleCheck}
          label="Paid This Month"
          value={fmt2.format(paidThisMonth)}
          unit={base}
          sub="Payments made to suppliers"
        />
      </div>

      <PayablesView rows={rows} canCreate={canCreate} />
    </div>
  );
}