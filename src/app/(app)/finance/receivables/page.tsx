import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { arService } from "@/services/ar.service";
import { getBaseCurrency } from "@/services/currency.service";
import {
  CalendarFillIcon, CheckFillIcon, CoinFillIcon, DocFillIcon, FinCard, PageBand, WalletArt,
} from "@/components/approvals/ui";
import { ReceivablesView, type RecRow } from "@/components/receivables/receivables-view";

const TZ = "Asia/Dhaka";
const LIVE = ["POSTED", "PARTIALLY_PAID"];
const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };
const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${Math.round(n)}`;

export default async function ReceivablesPage() {
  const user = await requireUser();

  const invoices = await arService.list().catch(() => null); // ar.view permission na thakle null
  if (!invoices) return <p className="text-muted-foreground">You do not have access to receivables.</p>;

  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: TZ });
  const monthKey = todayKey.slice(0, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [buyers, payments, base] = await Promise.all([
    prisma.buyer.findMany({
      where: { id: { in: [...new Set(invoices.map((i) => i.buyerId))] } },
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { companyId: user.companyId, direction: "IN", paymentDate: { gte: monthStart } },
      select: { amount: true, buyerInvoiceId: true },
    }),
    getBaseCurrency(user.companyId),
  ]);

  const rate = new Map(invoices.map((i) => [i.id, Number(i.exchangeRate)]));
  const receivedThisMonth = payments.reduce(
    (s, p) => s + Number(p.amount) * (rate.get(p.buyerInvoiceId ?? "") ?? 1),
    0
  );

  const rows: (RecRow & { outstandingBase: number })[] = invoices.map((i) => {
    const status = String(i.status);
    const live = LIVE.includes(status);
    const dueKey = i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null;
    return {
      id: i.id,
      invoiceNo: i.invoiceNo,
      buyer: buyers.find((b) => b.id === i.buyerId)?.name ?? "-",
      total: Number(i.totalAmount),
      received: Number(i.receivedAmount),
      currency: i.currency,
      due: dueKey,
      status,
      overdue: live && !!dueKey && dueKey < todayKey,
      dueThisMonth: live && !!dueKey && dueKey.startsWith(monthKey),
      outstandingBase: (Number(i.totalAmount) - Number(i.receivedAmount)) * Number(i.exchangeRate),
    };
  });

  const overdueRows = rows.filter((r) => r.overdue);
  const overdueCount = overdueRows.length;
  const overdueAmount = overdueRows.reduce((s, r) => s + r.outstandingBase, 0);
  const totalOutstanding = rows.filter((r) => LIVE.includes(r.status)).reduce((s, r) => s + r.outstandingBase, 0);
  const dueMonthAmount = rows.filter((r) => r.dueThisMonth).reduce((s, r) => s + r.outstandingBase, 0);

  const canCreate = can(user, "ar.create");

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <WalletArt />
            <div>
              <h1 className="font-heading text-3xl font-semibold text-navy-800">Receivables</h1>
              <p className="text-sm text-navy-800">Invoices to buyers: create, post, then record receipts</p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/finance/receivables/new"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New buyer invoice
            </Link>
          )}
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        <FinCard
          theme="overdue"
          art={<DocFillIcon />}
          label="Overdue Invoices"
          value={String(overdueCount)}
          note={overdueCount > 0 ? `${compact(overdueAmount)} ${base} overdue` : undefined}
        />
        <FinCard
          theme="green"
          art={<CoinFillIcon symbol={SYM[base] ?? base} />}
          label="Total Receivables"
          value={fmt2.format(totalOutstanding)}
          unit={base}
        />
        <FinCard
          theme="violet"
          art={<CalendarFillIcon />}
          label="Due This Month"
          value={fmt2.format(dueMonthAmount)}
          unit={base}
        />
        <FinCard
          theme="orange"
          art={<CheckFillIcon />}
          label="Received This Month"
          value={fmt2.format(receivedThisMonth)}
          unit={base}
        />
      </div>

      <ReceivablesView rows={rows} canCreate={canCreate} />
    </div>
  );
}