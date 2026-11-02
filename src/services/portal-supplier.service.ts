import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/business-rules";
import { delayDays as calcDelayDays } from "@/lib/calculations";
import { assertTransition, poTransitions } from "@/lib/status-rules";
import { PortalAccessError } from "@/lib/portal-scope";
import { portalAuditUser, portalIdentity, requireSupplierPortal } from "@/lib/portal-session";
import type { PoStatus } from "@/generated/prisma/enums";

// Supplier draft/approval-stage PO dekhbe na, shudhu pathano PO theke
const VISIBLE_PO: PoStatus[] = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT", "COMPLETE", "CLOSED"];
const CONFIRMABLE_PO: PoStatus[] = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"];

// Internal field (createdById, baseTotal, exchange rate ...) ekhane nai
const poSelect = {
  id: true,
  poNo: true,
  status: true,
  currency: true,
  paymentTerms: true,
  incoterms: true,
  destination: true,
  deliveryDate: true,
  sentAt: true,
  lines: {
    select: {
      id: true,
      quantity: true,
      receivedQty: true,
      unit: true,
      rate: true,
      taxPct: true,
      deliveryDate: true,
      material: { select: { name: true } },
    },
  },
  followUps: {
    select: {
      id: true,
      supplierPromisedDate: true,
      latestPromisedDate: true,
      actualReceiptDate: true,
      delayDays: true,
    },
  },
} as const;

const rfqSelect = (supplierId: string) =>
  ({
    id: true,
    rfqNo: true,
    status: true,
    dueDate: true,
    lines: {
      select: {
        id: true,
        quantity: true,
        unit: true,
        requiredDate: true,
        materialId: true,
        material: { select: { name: true } },
      },
    },
    quotations: {
      where: { supplierId },
      select: {
        id: true,
        quotationNo: true,
        revisionNo: true,
        unitPrice: true,
        currency: true,
        leadTimeDays: true,
        validUntil: true,
        status: true,
      },
    },
  }) as const;

const confirmSchema = z.object({
  poId: z.string().min(1),
  confirmedDate: z.coerce.date(),
  remarks: z.string().max(500).optional(),
});

class PortalSupplierService {
  async listPos() {
    const ctx = await requireSupplierPortal();
    return prisma.purchaseOrder.findMany({
      where: { supplierId: ctx.supplierId, companyId: ctx.companyId, status: { in: VISIBLE_PO } },
      select: poSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getPo(id: string) {
    const ctx = await requireSupplierPortal();
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, supplierId: ctx.supplierId, companyId: ctx.companyId, status: { in: VISIBLE_PO } },
      select: poSelect,
    });
    if (!po) throw new PortalAccessError("NOT_FOUND");
    return po;
  }

  async listRfqs() {
    const ctx = await requireSupplierPortal();
    return prisma.rfq.findMany({
      where: {
        companyId: ctx.companyId,
        status: "SENT",
        suppliers: { some: { supplierId: ctx.supplierId } },
      },
      select: rfqSelect(ctx.supplierId),
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getRfq(id: string) {
    const ctx = await requireSupplierPortal();
    const rfq = await prisma.rfq.findFirst({
      where: {
        id,
        companyId: ctx.companyId,
        status: "SENT",
        suppliers: { some: { supplierId: ctx.supplierId } },
      },
      select: rfqSelect(ctx.supplierId),
    });
    if (!rfq) throw new PortalAccessError("NOT_FOUND");
    return rfq;
  }

  // Supplier delivery date confirm kore. SENT hole PO ACKNOWLEDGED hoy, ar follow-up record update hoy.
  async confirmDate(input: unknown) {
    const ctx = await requireSupplierPortal();
    const d = confirmSchema.parse(input);

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: d.poId, supplierId: ctx.supplierId, companyId: ctx.companyId, status: { in: VISIBLE_PO } },
      include: { followUps: { orderBy: { updatedAt: "desc" }, take: 1 } },
    });
    if (!po) throw new PortalAccessError("NOT_FOUND");
    if (!CONFIRMABLE_PO.includes(po.status)) {
      throw new BusinessRuleError("This PO can no longer be confirmed");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d.confirmedDate < today) throw new BusinessRuleError("Confirmed date cannot be in the past");

    const firstConfirm = po.status === "SENT";
    if (firstConfirm) assertTransition(poTransitions, po.status, "ACKNOWLEDGED");
    const nextStatus: PoStatus = firstConfirm ? "ACKNOWLEDGED" : po.status;
    const follow = po.followUps[0] ?? null;
    const delay = calcDelayDays(d.confirmedDate);

    await prisma.$transaction(async (tx) => {
      if (follow) {
        await tx.poFollowUp.update({
          where: { id: follow.id },
          data: {
            latestPromisedDate: d.confirmedDate,
            ...(firstConfirm ? { supplierPromisedDate: d.confirmedDate } : {}),
            delayDays: delay,
            remarks: d.remarks ?? follow.remarks,
          },
        });
      } else {
        await tx.poFollowUp.create({
          data: {
            poId: po.id,
            supplierPromisedDate: d.confirmedDate,
            latestPromisedDate: d.confirmedDate,
            delayDays: delay,
            remarks: d.remarks,
          },
        });
      }
      if (firstConfirm) {
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: nextStatus } });
      }
    });

    await writeAudit({
      user: portalAuditUser(ctx),
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: po.id,
      before: { status: po.status, latestPromisedDate: follow?.latestPromisedDate ?? null },
      after: { status: nextStatus, latestPromisedDate: d.confirmedDate, ...portalIdentity(ctx) },
      reason: d.remarks ?? "Supplier confirmed delivery date via portal",
    });
    return { poId: po.id, status: nextStatus, confirmedDate: d.confirmedDate };
  }
}

export const portalSupplierService = new PortalSupplierService();