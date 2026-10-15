import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertSupplierActive } from "@/lib/business-rules";
import { assertTransition, invoiceTransitions } from "@/lib/status-rules";
import { nextPaymentNo, nextSupplierInvoiceNo } from "@/lib/numbering";
import { matchInvoice, paymentStatus, round2 } from "@/lib/finance-calc";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const createSchema = z.object({
  supplierId: z.string(),
  supplierInvoiceNo: z.string().min(1).max(60),
  poId: z.string().optional(),
  grnId: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).default("BDT"),
  exchangeRate: z.coerce.number().positive().default(1),
  subtotal: z.coerce.number().positive(),
  taxAmount: z.coerce.number().min(0).default(0),
  remarks: z.string().max(500).optional(),
});

const paySchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date(),
  method: z.enum(["CASH", "BANK", "CHEQUE", "LC", "MOBILE"]).default("BANK"),
  referenceNo: z.string().max(60).optional(),
  remarks: z.string().max(300).optional(),
});

class AccountsPayableService extends BaseService {
  private async load(id: string) {
    return found(await prisma.supplierInvoice.findUnique({ where: { id } }), "Supplier invoice");
  }

  async create(input: unknown) {
    const user = await this.guard("ap.create");
    const d = createSchema.parse(input);
    await assertSupplierActive(d.supplierId);
    const supplier = found(await prisma.supplier.findUnique({ where: { id: d.supplierId } }), "Supplier");
    await assertRecordInScope(user, supplier.companyId);

    const dup = await prisma.supplierInvoice.findFirst({
      where: { companyId: user.companyId, supplierId: d.supplierId, supplierInvoiceNo: d.supplierInvoiceNo },
    });
    if (dup) throw new BusinessRuleError("This supplier invoice number is already entered");

    let poId = d.poId;
    if (poId) {
      const po = found(await prisma.purchaseOrder.findUnique({ where: { id: poId } }), "PO");
      if (po.companyId !== user.companyId || po.supplierId !== d.supplierId) {
        throw new BusinessRuleError("This PO does not belong to the selected supplier");
      }
    }
    if (d.grnId) {
      const grn = found(await prisma.grn.findUnique({ where: { id: d.grnId } }), "GRN");
      if (grn.companyId !== user.companyId) throw new BusinessRuleError("GRN not found");
      if (!grn.postedAt) throw new BusinessRuleError("The GRN is not posted yet");
      if (poId && grn.poId !== poId) throw new BusinessRuleError("The GRN belongs to a different PO");
      poId = grn.poId;
    }

    const row = await prisma.supplierInvoice.create({
      data: {
        companyId: user.companyId,
        invoiceNo: await nextSupplierInvoiceNo(user.companyId),
        supplierId: d.supplierId,
        supplierInvoiceNo: d.supplierInvoiceNo,
        poId,
        grnId: d.grnId,
        invoiceDate: d.invoiceDate,
        dueDate: d.dueDate,
        currency: d.currency,
        exchangeRate: d.exchangeRate,
        subtotal: d.subtotal,
        taxAmount: d.taxAmount,
        totalAmount: round2(d.subtotal + d.taxAmount),
        remarks: d.remarks,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "SupplierInvoice", entityId: row.id, after: row });
    return row;
  }

  async list(filter: { status?: InvoiceStatus; supplierId?: string } = {}) {
    const user = await this.guard("ap.view");
    return prisma.supplierInvoice.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async get(id: string) {
    const user = await this.guard("ap.view");
    const row = await prisma.supplierInvoice.findUnique({ where: { id }, include: { payments: true } });
    const inv = found(row, "Supplier invoice");
    await assertRecordInScope(user, inv.companyId);
    return inv;
  }

  // PO বা GRN-এর মানের সাথে ইনভয়েসের subtotal মেলায় (কর বাদে)
  async match(id: string) {
    const user = await this.guard("ap.edit");
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    if (inv.status !== "DRAFT") throw new BusinessRuleError("Only a draft invoice can be matched");
    if (!inv.poId) throw new BusinessRuleError("Link a PO first");

    const po = found(await prisma.purchaseOrder.findUnique({ where: { id: inv.poId } }), "PO");
    if (po.currency !== inv.currency) {
      throw new BusinessRuleError("Invoice currency differs from the PO currency; check it by hand and post with an override reason");
    }

    let expected = 0;
    let basis = "PO";
    if (inv.grnId) {
      basis = "GRN";
      const lines = await prisma.grnLine.findMany({ where: { grnId: inv.grnId }, include: { poLine: true } });
      expected = lines.reduce((s, l) => s + Number(l.receivedQty) * Number(l.poLine.rate), 0);
    } else {
      const lines = await prisma.purchaseOrderLine.findMany({ where: { poId: inv.poId } });
      expected = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.rate), 0);
    }

    const r = matchInvoice(Number(inv.subtotal), expected);
    const row = await prisma.supplierInvoice.update({
      where: { id },
      data: {
        matchStatus: r.matched ? "MATCHED" : "MISMATCH",
        matchNote: `${basis} value ${round2(expected)}, invoice ${Number(inv.subtotal)}, difference ${r.diff}`,
      },
    });
    await this.audit({
      user, action: "UPDATE", entity: "SupplierInvoice", entityId: id,
      before: { matchStatus: inv.matchStatus }, after: { matchStatus: row.matchStatus, note: row.matchNote },
    });
    return row;
  }

  // Post করলে খরচ PO-র অর্ডার/স্টাইল অনুপাতে CostAllocation-এ ভাগ হয় (কর বাদে)
  async post(id: string, overrideReason?: string) {
    const user = await this.guard("ap.post");
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    assertTransition(invoiceTransitions, inv.status, "POSTED");

    if (inv.poId && inv.matchStatus !== "MATCHED") {
      if (!overrideReason || overrideReason.trim().length < 3) {
        throw new BusinessRuleError("Match the invoice with the PO/GRN first, or give an override reason");
      }
    }

    const poLines = inv.poId ? await prisma.purchaseOrderLine.findMany({ where: { poId: inv.poId } }) : [];
    const totalW = poLines.reduce((s, l) => s + Number(l.quantity) * Number(l.rate), 0);
    const shares = new Map<string, { orderId: string; styleId: string | null; w: number }>();
    for (const l of poLines) {
      if (!l.orderId) continue;
      const key = `${l.orderId}|${l.styleId ?? ""}`;
      const cur = shares.get(key) ?? { orderId: l.orderId, styleId: l.styleId, w: 0 };
      cur.w += Number(l.quantity) * Number(l.rate);
      shares.set(key, cur);
    }
    const baseSubtotal = Number(inv.subtotal) * Number(inv.exchangeRate);

    const [row] = await prisma.$transaction([
      prisma.supplierInvoice.update({
        where: { id },
        data: { status: "POSTED", overrideReason: overrideReason ?? null },
      }),
      prisma.costAllocation.createMany({
        data: totalW > 0
          ? [...shares.values()].map((x) => ({
              companyId: inv.companyId,
              sourceType: "SUPPLIER_INVOICE",
              sourceId: id,
              orderId: x.orderId,
              styleId: x.styleId,
              amountBase: round2((baseSubtotal * x.w) / totalW),
              note: inv.invoiceNo,
            }))
          : [],
      }),
    ]);
    await this.audit({
      user, action: "UPDATE", entity: "SupplierInvoice", entityId: id,
      before: { status: inv.status }, after: { status: row.status }, reason: overrideReason,
    });
    return row;
  }

  async pay(id: string, input: unknown) {
    const user = await this.guard("ap.pay");
    const d = paySchema.parse(input);
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    if (inv.status !== "POSTED" && inv.status !== "PARTIALLY_PAID") {
      throw new BusinessRuleError("Only a posted invoice can be paid");
    }
    const outstanding = round2(Number(inv.totalAmount) - Number(inv.paidAmount));
    if (d.amount > outstanding) {
      throw new BusinessRuleError(`Payment is more than the outstanding amount (${outstanding})`);
    }
    const newPaid = round2(Number(inv.paidAmount) + d.amount);
    const next = paymentStatus(Number(inv.totalAmount), newPaid);
    if (next !== inv.status) assertTransition(invoiceTransitions, inv.status, next);

    const paymentNo = await nextPaymentNo(user.companyId);
    const [payment, updated] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          companyId: inv.companyId,
          paymentNo,
          direction: "OUT",
          method: d.method,
          paymentDate: d.paymentDate,
          amount: d.amount,
          currency: inv.currency,
          referenceNo: d.referenceNo,
          remarks: d.remarks,
          supplierInvoiceId: id,
          createdById: user.id,
        },
      }),
      prisma.supplierInvoice.update({ where: { id }, data: { paidAmount: newPaid, status: next } }),
    ]);
    await this.audit({ user, action: "CREATE", entity: "Payment", entityId: payment.id, after: payment });
    return { payment, invoice: updated };
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("ap.cancel");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const inv = await this.load(id);
    await assertRecordInScope(user, inv.companyId);
    if (Number(inv.paidAmount) > 0) throw new BusinessRuleError("An invoice with payments cannot be cancelled");
    assertTransition(invoiceTransitions, inv.status, "CANCELLED");
    const [row] = await prisma.$transaction([
      prisma.supplierInvoice.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } }),
      prisma.costAllocation.deleteMany({ where: { sourceType: "SUPPLIER_INVOICE", sourceId: id } }),
    ]);
    await this.audit({
      user, action: "UPDATE", entity: "SupplierInvoice", entityId: id,
      before: { status: inv.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // দেরি হয়ে যাওয়া payable (Alert / Dashboard-এর জন্য)
  async overdue() {
    const user = await this.guard("ap.view");
    const rows = await prisma.supplierInvoice.findMany({
      where: {
        ...(await listFilter(user)),
        status: { in: ["POSTED", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    });
    return rows.map((r) => ({ ...r, outstanding: round2(Number(r.totalAmount) - Number(r.paidAmount)) }));
  }
}

export const apService = new AccountsPayableService();