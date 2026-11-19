import { requireUser } from "@/lib/permissions";
import { expenseService } from "@/services/expense.service";
import { orderService } from "@/services/order.service";
import { getBaseCurrency } from "@/services/currency.service";
import {
  CalendarFillIcon, CoinFillIcon, DocFillIcon, ExpenseArt, FinCard, PageBand,
} from "@/components/approvals/ui";
import { ExpenseBoard, type ExpenseItem } from "./expense-board";
import { ExpenseForm } from "./expense-form";

const TZ = "Asia/Dhaka";
const fmt2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };

export default async function ExpensesPage() {
  const user = await requireUser();
  const [list, orders, base] = await Promise.all([
    expenseService.list(),
    orderService.list().catch(() => []),
    getBaseCurrency(user.companyId),
  ]);
  const orderNo = new Map(orders.map((o) => [o.id, o.orderNo]));

  const monthKey = new Date().toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
  const live = list.filter((e) => e.status !== "CANCELLED");
  const inBase = (e: (typeof list)[number]) => Number(e.amount) * Number(e.exchangeRate);
  const totalBase = live.reduce((s, e) => s + inBase(e), 0);
  const monthBase = live
    .filter((e) => e.expenseDate.toISOString().slice(0, 7) === monthKey)
    .reduce((s, e) => s + inBase(e), 0);
  const pendingCount = list.filter((e) => e.status === "DRAFT").length;

  const rows: ExpenseItem[] = list.map((e) => ({
    id: e.id,
    expenseNo: e.expenseNo,
    date: e.expenseDate.toISOString().slice(0, 10),
    category: e.category.toLowerCase(),
    description: e.description,
    amount: fmt2.format(Number(e.amount)),
    currency: e.currency,
    order: e.orderId ? (orderNo.get(e.orderId) ?? "") : "",
    status: e.status,
  }));

  return (
    <div className="stagger space-y-5">
      <PageBand>
        <header className="flex items-center gap-4">
          <ExpenseArt />
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy-800">Expenses</h1>
            <p className="text-sm text-navy-800">
              Costs that are not supplier invoices. Approving adds the cost to the order.
            </p>
          </div>
        </header>
      </PageBand>

      <div className="stagger grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        <FinCard
          theme="blue"
          wave={false}
          art={<DocFillIcon />}
          label="Total Expenses"
          value={fmt2.format(totalBase)}
          unit={base}
        />
        <FinCard
          theme="green"
          wave={false}
          art={<CoinFillIcon symbol={SYM[base] ?? base} />}
          label="This Month"
          value={fmt2.format(monthBase)}
          unit={base}
        />
        <FinCard
          theme="violet"
          wave={false}
          art={<CalendarFillIcon />}
          label="Pending Approval"
          value={String(pendingCount)}
        />
      </div>

      <ExpenseForm orders={orders.filter((o) => o.status !== "CANCELLED").map((o) => ({ id: o.id, label: o.orderNo }))} />
      <ExpenseBoard rows={rows} />
    </div>
  );
}