import { PageHeader } from "@/components/layout/page-header";
import { expenseService } from "@/services/expense.service";
import { orderService } from "@/services/order.service";
import { ExpenseBoard, type ExpenseItem } from "./expense-board";
import { ExpenseForm } from "./expense-form";

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default async function ExpensesPage() {
  const [list, orders] = await Promise.all([expenseService.list(), orderService.list().catch(() => [])]);
  const orderNo = new Map(orders.map((o) => [o.id, o.orderNo]));

  const rows: ExpenseItem[] = list.map((e) => ({
    id: e.id,
    expenseNo: e.expenseNo,
    date: e.expenseDate.toISOString().slice(0, 10),
    category: e.category.toLowerCase(),
    description: e.description,
    amount: money(Number(e.amount)),
    currency: e.currency,
    order: e.orderId ? (orderNo.get(e.orderId) ?? "") : "",
    status: e.status,
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" description="Costs that are not supplier invoices. Approving adds the cost to the order" />
      <ExpenseBoard rows={rows} />
      <ExpenseForm orders={orders.filter((o) => o.status !== "CANCELLED").map((o) => ({ id: o.id, label: o.orderNo }))} />
    </div>
  );
}