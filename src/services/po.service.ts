import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  assertPoReadyForApproval,
  assertPrApprovedForPo,
  assertRejectionReason,
  assertSupplierActive,
} from "@/lib/business-rules";
import { poTotals } from "@/lib/calculations";
import { assertTransition, poTransitions } from "@/lib/status-rules";
import { nextPoNo } from "@/lib/numbering";
import {
  approvalNeeded,
  assertApprovalAllows,
  assertRecordInScope,
  found,
  listFilter,
} from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { PoStatus } from "@/generated/prisma/enums";
import { snapshotMoney } from "./currency.service";
import { approvalService } from "./approval.service";
import { BaseService } from "./base.service";

const lineSchema = z.object({
  prLineId: z.string().min(1),
  rate: z.number().positive(),
  taxPct: z.number().min(0).max(100).optional(),
  quantity: z.number().positive().optional(), // না দিলে PR লাইনের পুরো পরিমাণ
  deliveryDate: z.coerce.date().optional(),
});

const createSchema = z.object({
  prId: z.string().min(1),
  supplierId: z.string().min(1),
  currency: z.string().length(3).optional(),
  paymentTerms: z.string().max(150).optional(),
  incoterms: z.string().max(20).optional(),
  destination: z.string().max(200).optional(),
  deliveryDate: z.coerce.date().optional(),
  lines: z.array(lineSchema).min(1),
});

const headerSchema = z
  .object({
    paymentTerms: z.string().max(150),
    incoterms: z.string().max(20),
    destination: z.string().max(200),
    deliveryDate: z.coerce.date(),
  })
  .partial();

const lineEditSchema = z
  .object({
    rate: z.number().positive(),
    taxPct: z.number().min(0).max(100),
    deliveryDate: z.coerce.date(),
  })
  .partial();

const piSchema = z.object({
  poId: z.string().min(1),
  piNo: z.string().min(1).max(60),
  piDate: z.coerce.date().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  fileUrl: z.string().max(500).optional(),
});

const editable = (s: PoStatus) => s === "DRAFT" || s === "REVISION";

class PoService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const po = found(await prisma.purchaseOrder.findUnique({ where: { id } }), "PO");
    await assertRecordInScope(user, po.companyId);
    return po;
  }

  // লাইন বদলালে মোট দাম আর ওই মুহূর্তের রেট আবার বসে
  private async refreshTotals(poId: string) {
    const po = found(
      await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } }),
      "PO"
    );
    const t = poTotals(
      po.lines.map((l) => ({ quantity: Number(l.quantity), rate: Number(l.rate), taxPct: Number(l.taxPct) }))
    );
    const snap = await snapshotMoney({ amount: t.grandTotal, currency: po.currency, companyId: po.companyId });
    return prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseTotal: snap.baseAmount,
      },
    });
  }

  async list(filter: { supplierId?: string; status?: PoStatus } = {}) {
    const user = await this.guard("po.view");
    return prisma.purchaseOrder.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { supplier: { select: { name: true } }, lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("po.view");
    await this.load(user, id);
    return prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: { include: { material: true, order: { select: { orderNo: true } } } },
        followUps: { include: { contacts: true } },
        proformaInvoices: true,
      },
    });
  }

  // Approved PR থেকে PO। একটা PR থেকে একাধিক PO হতে পারে, তবে PR-এর পরিমাণ ছাড়ানো যাবে না।
  async createFromPr(input: unknown) {
    const user = await this.guard("po.create");
    const data = createSchema.parse(input);

    const pr = await assertPrApprovedForPo(data.prId);
    if (pr.companyId !== user.companyId) throw new BusinessRuleError("PR not found");
    const supplier = await assertSupplierActive(data.supplierId);
    if (supplier.companyId !== user.companyId) throw new BusinessRuleError("Supplier not found");

    const prLines = await prisma.purchaseRequisitionLine.findMany({ where: { prId: pr.id } });
    if (new Set(data.lines.map((l) => l.prLineId)).size !== data.lines.length) {
      throw new BusinessRuleError("A PR line can appear only once");
    }

    const lineRows = [];
    for (const l of data.lines) {
      const prLine = prLines.find((x) => x.id === l.prLineId);
      if (!prLine) throw new BusinessRuleError("PR line does not belong to this PR");
      const qty = l.quantity ?? Number(prLine.quantity);
      const agg = await prisma.purchaseOrderLine.aggregate({
        _sum: { quantity: true },
        where: { prLineId: prLine.id, po: { status: { notIn: ["CANCELLED", "REJECTED"] } } },
      });
      if (Number(agg._sum.quantity ?? 0) + qty > Number(prLine.quantity)) {
        throw new BusinessRuleError("PO quantity is more than the PR quantity");
      }
      lineRows.push({
        materialId: prLine.materialId,
        prLineId: prLine.id,
        orderId: pr.orderId ?? undefined, // Order/Style বরাদ্দ (সেকশন ১৮)
        styleId: pr.styleId ?? undefined,
        quantity: qty,
        unit: prLine.unit,
        rate: l.rate,
        taxPct: l.taxPct ?? 0,
        deliveryDate: l.deliveryDate ?? prLine.requiredDate ?? data.deliveryDate,
      });
    }

    const currency = (data.currency ?? supplier.currency).toUpperCase();
    const totals = poTotals(
      lineRows.map((l) => ({ quantity: l.quantity, rate: l.rate, taxPct: l.taxPct }))
    );
    const snap = await snapshotMoney({ amount: totals.grandTotal, currency, companyId: user.companyId });

    const po = await prisma.purchaseOrder.create({
      data: {
        companyId: user.companyId,
        poNo: await nextPoNo(user.companyId),
        supplierId: supplier.id,
        currency,
        paymentTerms: data.paymentTerms ?? supplier.paymentTerms ?? undefined,
        incoterms: data.incoterms,
        destination: data.destination,
        deliveryDate: data.deliveryDate ?? pr.requiredDate ?? undefined,
        createdById: user.id,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseTotal: snap.baseAmount,
        lines: { create: lineRows },
      },
      include: { lines: true },
    });

    // PR-এর সব লাইন পুরো অর্ডার হয়ে গেলে PR-এর অবস্থা PO_CREATED
    let covered = true;
    for (const pl of prLines) {
      const a = await prisma.purchaseOrderLine.aggregate({
        _sum: { quantity: true },
        where: { prLineId: pl.id, po: { status: { notIn: ["CANCELLED", "REJECTED"] } } },
      });
      if (Number(a._sum.quantity ?? 0) < Number(pl.quantity)) covered = false;
    }
    if (covered) {
      await prisma.purchaseRequisition.update({ where: { id: pr.id }, data: { status: "PO_CREATED" } });
    }
    await this.audit({ user, action: "CREATE", entity: "PurchaseOrder", entityId: po.id, after: po });
    return po;
  }

  async updateHeader(id: string, input: unknown) {
    const user = await this.guard("po.edit");
    const before = await this.load(user, id);
    if (!editable(before.status)) throw new BusinessRuleError("Only a draft or revised PO can be edited");
    const data = headerSchema.parse(input);
    const row = await prisma.purchaseOrder.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "PurchaseOrder", entityId: id, before, after: row });
    return row;
  }

  // দাম, ট্যাক্স ও ডেলিভারির তারিখ বদলানো যায়। পরিমাণ বদলাতে চাইলে PO বাতিল করে নতুন বানান।
  async updateLine(lineId: string, input: unknown) {
    const user = await this.guard("po.edit");
    const patch = lineEditSchema.parse(input);
    const line = found(await prisma.purchaseOrderLine.findUnique({ where: { id: lineId } }), "PO line");
    const po = await this.load(user, line.poId);
    if (!editable(po.status)) throw new BusinessRuleError("Only a draft or revised PO can be edited");
    const row = await prisma.purchaseOrderLine.update({ where: { id: lineId }, data: patch });
    await this.refreshTotals(po.id);
    await this.audit({ user, action: "UPDATE", entity: "PurchaseOrderLine", entityId: lineId, before: line, after: row });
    return row;
  }

  // Submit: Approval workflow থাকলে অনুরোধও যায় (টাকার অংক বেস মুদ্রায়)
  async submit(id: string) {
    const user = await this.guard("po.edit");
    const po0 = await this.load(user, id);
    assertTransition(poTransitions, po0.status, "SUBMITTED");
    const po = await assertPoReadyForApproval(id);

    if (await approvalNeeded(po.companyId, "PurchaseOrder")) {
      await approvalService.submit({
        entityType: "PurchaseOrder",
        entityId: id,
        title: `PO ${po.poNo}`,
        amount: Number(po.baseTotal ?? 0),
      });
    }
    const row = await prisma.purchaseOrder.update({ where: { id }, data: { status: "SUBMITTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po0.status }, after: { status: row.status },
    });
    return row;
  }

  async approve(id: string) {
    const user = await this.guard("po.approve");
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "APPROVED");
    await assertPoReadyForApproval(id);
    await assertApprovalAllows(po.companyId, "PurchaseOrder", id);
    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), rejectionReason: null },
    });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status },
    });
    return row;
  }

  // নিয়ম ২: Reject করতে কারণ লাগবে। Rejected → Revision → Resubmit
  async reject(id: string, reason: string) {
    const user = await this.guard("po.approve");
    assertRejectionReason(reason);
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "REJECTED");
    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "REJECTED", rejectionReason: reason },
    });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  async revise(id: string) {
    const user = await this.guard("po.edit");
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "REVISION");
    return prisma.purchaseOrder.update({ where: { id }, data: { status: "REVISION" } });
  }

  // Supplier-কে পাঠানো। একই সাথে Follow-up রেকর্ড খোলা হয় (সেকশন ১৯)
  async send(id: string) {
    const user = await this.guard("po.edit");
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "SENT");
    if (!po.deliveryDate) throw new BusinessRuleError("Delivery date is required");

    const row = await prisma.$transaction(async (tx) => {
      const exists = await tx.poFollowUp.count({ where: { poId: id } });
      if (exists === 0) {
        await tx.poFollowUp.create({
          data: { poId: id, supplierPromisedDate: po.deliveryDate!, latestPromisedDate: po.deliveryDate! },
        });
      }
      return tx.purchaseOrder.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status },
    });
    return row;
  }

  // Supplier নিশ্চিত করলে। নতুন প্রতিশ্রুত তারিখ দিলে Follow-up-ও বদলায়।
  async acknowledge(id: string, promisedDate?: Date) {
    const user = await this.guard("po.edit");
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "ACKNOWLEDGED");
    const row = await prisma.$transaction(async (tx) => {
      if (promisedDate) {
        await tx.poFollowUp.updateMany({
          where: { poId: id },
          data: { supplierPromisedDate: promisedDate, latestPromisedDate: promisedDate },
        });
      }
      return tx.purchaseOrder.update({ where: { id }, data: { status: "ACKNOWLEDGED" } });
    });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status },
    });
    return row;
  }

  // PARTIAL_RECEIPT ও COMPLETE বসবে ধাপ ঙ-র মাল গ্রহণ (GRN) থেকে।
  async close(id: string) {
    const user = await this.guard("po.edit");
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "CLOSED");
    const row = await prisma.purchaseOrder.update({ where: { id }, data: { status: "CLOSED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status },
    });
    return row;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("po.edit");
    assertRejectionReason(reason);
    const po = await this.load(user, id);
    assertTransition(poTransitions, po.status, "CANCELLED");
    const received = await prisma.purchaseOrderLine.count({ where: { poId: id, receivedQty: { gt: 0 } } });
    if (received > 0) throw new BusinessRuleError("A PO with received goods cannot be cancelled");
    const row = await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    await this.audit({
      user, action: "UPDATE", entity: "PurchaseOrder", entityId: id,
      before: { status: po.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // Supplier-এর Proforma Invoice নথিভুক্ত করা (রেট সংরক্ষিত থাকে)
  async addProformaInvoice(input: unknown) {
    const user = await this.guard("po.edit");
    const data = piSchema.parse(input);
    const po = await this.load(user, data.poId);
    const currency = (data.currency ?? po.currency).toUpperCase();
    const snap = await snapshotMoney({ amount: data.amount, currency, companyId: po.companyId });
    const row = await prisma.supplierPi.create({
      data: {
        supplierId: po.supplierId,
        poId: po.id,
        piNo: data.piNo,
        piDate: data.piDate,
        amount: data.amount,
        currency,
        fileUrl: data.fileUrl,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseAmount: snap.baseAmount,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "SupplierPi", entityId: row.id, after: row });
    return row;
  }
}

export const poService = new PoService();