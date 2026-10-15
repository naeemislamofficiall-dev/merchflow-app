import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertBuyerActive } from "@/lib/business-rules";
import { assertTransition, invoiceTransitions } from "@/lib/status-rules";
import { nextBuyerInvoiceNo, nextPaymentNo } from "@/lib/numbering";
import { paymentStatus, round2 } from "@/lib/finance-calc";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const lineSchema = z.object({
  orderId: z.string(),
  styleId: z.string(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

const createSchema = z.object({
  buyerId: z.string(),
  shipmentId: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).default("USD"),
  exchangeRate: z.coerce.number().positive().default(1),
  remarks: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1),
});

const receiveSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date(),
  method: z.enum(["CASH", "BANK", "CHEQUE", "LC", "MOBILE"]).default("BANK"),
  referenceNo: z.string().max(60).optional(),
  remarks: z.string().max(300).optional(),
});

class AccountsReceivableService extends BaseService {
  private async load(id: string) {
    return found(await prisma.buyerInvoice.findUnique({ where: { id } }), "Buyer invoice");
  }

  async create(input: unknown) {
    const user = await this.guard("ar.create");
    const d = createSchema.parse(input);
    await assertBuyerActive(d.buyerId);

    if (d.shipmentId) {
      const s = found(await prisma.shipment.findUnique({ where: { id: d.shipmentId } }), "Shipment");
      if (s.companyId !== user.companyId || s.buyerId !== d.buyerId) {
        throw new BusinessRuleError("This shipment does not belong to the selected buyer");
      }
    }

    const seen = new Set<string>();
    for (const l of d.lines) {
      const key = `${l.orderId}|${l.styleId}`;
      if (seen.has(key)) throw new BusinessRuleError("The same order and style appears twice in one invoice");
      seen.add(key);

      const order = found(await prisma.order.findUnique({ where: { id: l.orderId } }), "Order");
      if (order.companyId !== user.companyId || order.buyerId !== d.buyerId) {
        throw new BusinessRuleError("An order in the lines does not belong to this buyer");
      }
      const ordered = await prisma.orderLine.aggregate({
        where: { orderId: l.orderId, styleId: l.styleId },
        _sum: { quantity: true },
      });
      if (!ordered._sum.quantity) throw new BusinessRuleError("A style in the lines is not part of that order");
      const invoiced = await prisma.buyerInvoiceLine.aggregate({
        where: { orderId: l.orderId, styleId: l.styleId, invoice: { status: { not: "CANCELLED" } } },
        _sum: { quantity: true },
      });
      if ((invoiced._sum.quantity ?? 0) + l.quantity > ordered._sum.quantity) {
        throw new BusinessRuleError("Invoice quantity is more than the order quantity");
      }
    }

    const lines = d.lines.map((l) => ({ ...l, amount: round2(l.quantity * l.unitPrice) }));
    const total = round2(lines.reduce((s, l) => s + l.amount, 0));

    const row = await prisma.buyerInvoice.create({
      data: {
        companyId: user.companyId,
        invoiceNo: await nextBuyerInvoiceNo(user.companyId),
        buyerId: d.buyerId,
        shipmentId: d.shipmentId,
        invoiceDate: d.invoiceDate,
        dueDate: d.dueDate,
        currency: d.currency,
        exchangeRate: d.exchangeRate,
        totalAmount: total,
        remarks: d.remarks,
        createdById: user.id,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    await this.audit({ user, action: "CREATE", entity: "BuyerInvoice", entityId: row.id, after: row });
    return row;
  }

  async list(filter: { status?: InvoiceStatus; buyerId?: string } = {}) {
    const user = await this.guard("ar.view");
    return prisma.buyerInvoice.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async get(id: string) {
    const user = await this.guard("ar.view");
    const row = await prisma.buyerInvoice.findUnique({ where: { id }, include: { lines: true, payments: true } });
    const inv = found(row, "Buyer invoice");
    await assertRecordInScope(user, inv.companyId);
    return inv;
  }

  // শিপমেন্ট জুড়লে সেটা সত্যিই জাহাজে উঠেছে কিনা দেখে তবেই post
  async post(id: string) {
    const user = await this.guard("ar.post");
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    assertTransition(invoiceTransitions, inv.status, "POSTED");
    if (inv.shipmentId) {
      const s = found(await prisma.shipment.findUnique({ where: { id: inv.shipmentId } }), "Shipment");
      if (!["SHIPPED", "DELIVERED", "CLOSED"].includes(s.status)) {
        throw new BusinessRuleError("The shipment has not shipped yet");
      }
    }
    const row = await prisma.buyerInvoice.update({ where: { id }, data: { status: "POSTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "BuyerInvoice", entityId: id,
      before: { status: inv.status }, after: { status: row.status },
    });
    return row;
  }

  async receive(id: string, input: unknown) {
    const user = await this.guard("ar.receive");
    const d = receiveSchema.parse(input);
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    if (inv.status !== "POSTED" && inv.status !== "PARTIALLY_PAID") {
      throw new BusinessRuleError("Only a posted invoice can receive payment");
    }
    const outstanding = round2(Number(inv.totalAmount) - Number(inv.receivedAmount));
    if (d.amount > outstanding) {
      throw new BusinessRuleError(`Amount is more than the outstanding receivable (${outstanding})`);
    }
    const newReceived = round2(Number(inv.receivedAmount) + d.amount);
    const next = paymentStatus(Number(inv.totalAmount), newReceived);
    if (next !== inv.status) assertTransition(invoiceTransitions, inv.status, next);

    const paymentNo = await nextPaymentNo(user.companyId);
    const [payment, updated] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          companyId: inv.companyId,
          paymentNo,
          direction: "IN",
          method: d.method,
          paymentDate: d.paymentDate,
          amount: d.amount,
          currency: inv.currency,
          referenceNo: d.referenceNo,
          remarks: d.remarks,
          buyerInvoiceId: id,
          createdById: user.id,
        },
      }),
      prisma.buyerInvoice.update({ where: { id }, data: { receivedAmount: newReceived, status: next } }),
    ]);
    await this.audit({ user, action: "CREATE", entity: "Payment", entityId: payment.id, after: payment });
    return { payment, invoice: updated };
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("ar.cancel");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    if (Number(inv.receivedAmount) > 0) throw new BusinessRuleError("An invoice with receipts cannot be cancelled");
    assertTransition(invoiceTransitions, inv.status, "CANCELLED");
    const row = await prisma.buyerInvoice.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
    await this.audit({
      user, action: "UPDATE", entity: "BuyerInvoice", entityId: id,
      before: { status: inv.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // দেরি হয়ে যাওয়া receivable
  async overdue() {
    const user = await this.guard("ar.view");
    const rows = await prisma.buyerInvoice.findMany({
      where: {
        ...(await listFilter(user)),
        status: { in: ["POSTED", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    });
    return rows.map((r) => ({ ...r, outstanding: round2(Number(r.totalAmount) - Number(r.receivedAmount)) }));
  }
}

export const arService = new AccountsReceivableService();