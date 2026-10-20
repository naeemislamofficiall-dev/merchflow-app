"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { apService } from "@/services/ap.service";
import { arService } from "@/services/ar.service";
import { expenseService } from "@/services/expense.service";

type PaymentValues = {
  amount: string;
  paymentDate: string;
  method: string;
  referenceNo: string;
  remarks: string;
};

function payment(v: PaymentValues) {
  const { amount, ...rest } = dropEmpty(v);
  return { ...rest, amount: Number(amount) };
}

// ---------- Payables (supplier invoice) ----------
export async function createPayableAction(values: {
  supplierId: string;
  supplierInvoiceNo: string;
  poId: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  taxAmount: string;
  remarks: string;
}) {
  return runAction(async () => {
    const { subtotal, taxAmount, exchangeRate, ...rest } = dropEmpty(values);
    const row = await apService.create({
      ...rest,
      subtotal: Number(subtotal),
      ...(taxAmount !== undefined ? { taxAmount: Number(taxAmount) } : {}),
      ...(exchangeRate !== undefined ? { exchangeRate: Number(exchangeRate) } : {}),
    });
    return { id: row.id };
  });
}

export async function matchPayableAction(id: string) {
  return runAction(async () => {
    await apService.match(id);
    return { id };
  });
}

export async function postPayableAction(id: string, overrideReason?: string) {
  return runAction(async () => {
    await apService.post(id, overrideReason);
    return { id };
  });
}

export async function payPayableAction(id: string, values: PaymentValues) {
  return runAction(async () => {
    await apService.pay(id, payment(values));
    return { id };
  });
}

export async function cancelPayableAction(id: string, reason: string) {
  return runAction(async () => {
    await apService.cancel(id, reason);
    return { id };
  });
}

// ---------- Receivables (buyer invoice) ----------
export async function createReceivableAction(values: {
  buyerId: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  remarks: string;
  lines: { orderId: string; styleId: string; quantity: string; unitPrice: string }[];
}) {
  return runAction(async () => {
    const { lines, exchangeRate, ...rest } = dropEmpty(values);
    const row = await arService.create({
      ...rest,
      ...(exchangeRate !== undefined ? { exchangeRate: Number(exchangeRate) } : {}),
      lines: (lines ?? []).map((l) => ({
        orderId: l.orderId,
        styleId: l.styleId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
    });
    return { id: row.id };
  });
}

export async function postReceivableAction(id: string) {
  return runAction(async () => {
    await arService.post(id);
    return { id };
  });
}

export async function receiveReceivableAction(id: string, values: PaymentValues) {
  return runAction(async () => {
    await arService.receive(id, payment(values));
    return { id };
  });
}

export async function cancelReceivableAction(id: string, reason: string) {
  return runAction(async () => {
    await arService.cancel(id, reason);
    return { id };
  });
}

// ---------- Expenses ----------
export async function createExpenseAction(values: {
  category: string;
  expenseDate: string;
  description: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  orderId: string;
  vendorName: string;
}) {
  return runAction(async () => {
    const { amount, exchangeRate, ...rest } = dropEmpty(values);
    const row = await expenseService.create({
      ...rest,
      amount: Number(amount),
      ...(exchangeRate !== undefined ? { exchangeRate: Number(exchangeRate) } : {}),
    });
    return { id: row.id };
  });
}

export async function approveExpenseAction(id: string) {
  return runAction(async () => {
    await expenseService.approve(id);
    return { id };
  });
}

export async function cancelExpenseAction(id: string, reason: string) {
  return runAction(async () => {
    await expenseService.cancel(id, reason);
    return { id };
  });
}