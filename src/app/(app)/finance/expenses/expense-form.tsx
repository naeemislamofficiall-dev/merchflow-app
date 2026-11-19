"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ChevronDown, LayoutGrid, Plus, Send } from "lucide-react";
import { createExpenseAction } from "../actions";

type Values = {
  category: string;
  expenseDate: string;
  description: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  orderId: string;
  vendorName: string;
};

const CATEGORIES = ["FACTORY", "PRODUCTION", "FREIGHT", "SAMPLE", "OTHER"];
const SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳" };

const FIELD =
  "h-12 w-full rounded-lg border bg-card px-4 text-sm text-navy-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200";

function Field({
  label, htmlFor, required, hint, children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-800">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ExpenseForm({ orders }: { orders: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, control } = useForm<Values>({
    defaultValues: {
      category: "FACTORY",
      expenseDate: "",
      description: "",
      amount: "",
      currency: "BDT",
      exchangeRate: "1",
      orderId: "",
      vendorName: "",
    },
  });
  const cur = (useWatch({ control, name: "currency" }) ?? "").trim().toUpperCase();

  function onSubmit(v: Values) {
    setError("");
    if (!v.expenseDate || v.description.trim().length < 3) {
      setError("Date and a description of at least 3 characters are required");
      return;
    }
    if (!(Number(v.amount) > 0)) {
      setError("Amount must be more than 0");
      return;
    }
    if (v.currency.trim().length !== 3) {
      setError("Currency must be 3 letters, for example BDT");
      return;
    }
    start(async () => {
      const res = await createExpenseAction({ ...v, currency: v.currency.trim().toUpperCase() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <section className="rounded-card border bg-card p-6 shadow-card">
        <h2 className="mb-5 flex items-center gap-3 font-heading text-xl font-semibold text-navy-800">
          <span className="h-6 w-1 rounded-full bg-blue-600" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
          Add Expense
        </h2>

        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Category" htmlFor="category" required>
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select id="category" {...register("category")} className={`${FIELD} appearance-none pl-11 pr-10 capitalize`}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            </div>
          </Field>

          <Field label="Date" htmlFor="expenseDate" required>
            <input id="expenseDate" type="date" {...register("expenseDate")} className={FIELD} />
          </Field>

          <Field label="Amount" htmlFor="amount" required>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="any"
                min="0"
                placeholder="Enter amount"
                {...register("amount")}
                className={`${FIELD} pr-16`}
              />
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-9 min-w-9 items-center justify-center rounded-md bg-blue-50 px-2 text-xs font-bold text-navy-800">
                {SYM[cur] ?? (cur || "?")}
              </span>
            </div>
          </Field>

          <Field label="Currency" htmlFor="currency" required>
            <input id="currency" maxLength={3} {...register("currency")} className={`${FIELD} uppercase`} />
          </Field>

          <Field label="Exchange rate to base" htmlFor="exchangeRate">
            <input id="exchangeRate" type="number" step="any" min="0" {...register("exchangeRate")} className={FIELD} />
          </Field>

          <Field label="Order" htmlFor="orderId" hint="Approved expenses with an order go to its cost">
            <div className="relative">
              <select id="orderId" {...register("orderId")} className={`${FIELD} appearance-none pr-10`}>
                <option value="">None</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" />
            </div>
          </Field>

          <Field label="Vendor" htmlFor="vendorName">
            <input
              id="vendorName"
              maxLength={120}
              placeholder="Enter vendor name"
              {...register("vendorName")}
              className={FIELD}
            />
          </Field>

          <Field label="Description" htmlFor="description" required>
            <input
              id="description"
              maxLength={300}
              placeholder="Enter description..."
              {...register("description")}
              className={FIELD}
            />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 inline-flex h-12 items-center gap-2.5 rounded-lg bg-navy-800 px-6 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {pending ? "Saving..." : "Add expense"}
        </button>
      </section>
    </form>
  );
}