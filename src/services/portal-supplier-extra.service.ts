import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/business-rules";
import { nextQuotationNo } from "@/lib/numbering";
import { PortalAccessError } from "@/lib/portal-scope";
import { portalAuditUser, portalIdentity, requireSupplierPortal } from "@/lib/portal-session";
import type { PoStatus } from "@/generated/prisma/enums";
import { snapshotMoney } from "./currency.service";

const VISIBLE_PO: PoStatus[] = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT", "COMPLETE", "CLOSED"];
const OPEN_PO: PoStatus[] = ["SENT", "ACKNOWLEDGED", "PARTIAL_RECEIPT"];
const DOC_TYPES = ["PACKING_LIST", "COMMERCIAL_INVOICE", "TEST_REPORT", "CERTIFICATE", "OTHER"] as const;

const quotationSchema = z.object({
  rfqId: z.string().min(1),
  materialId: z.string().min(1),
  unitPrice: z.number().positive(),
  currency: z.string().length(3).optional(),
  leadTimeDays: z.number().int().positive().optional(),
  paymentTerms: z.string().max(150).optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

const shipmentSchema = z
  .object({
    poId: z.string().min(1),
    shippedDate: z.coerce.date().optional(),
    etaDate: z.coerce.date().optional(),
    carrier: z.string().max(100).optional(),
    trackingNo: z.string().max(100).optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => v.shippedDate || v.etaDate || v.trackingNo, {
    message: "Give a shipped date, an ETA or a tracking number",
  });

const documentSchema = z.object({
  poId: z.string().min(1),
  docType: z.enum(DOC_TYPES),
  fileName: z.string().min(1).max(200),
  url: z.string().max(500).refine((u) => u.startsWith("https://"), { message: "Link must start with https://" }),
});

class PortalSupplierExtraService {
  // PO shudhu nijer supplier-er hole pabe, noile "Not found" (existence leak nai)
  private async ownedPo(poId: string, ctx: { supplierId: string; companyId: string }, statuses: PoStatus[]) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, supplierId: ctx.supplierId, companyId: ctx.companyId, status: { in: statuses } },
      select: { id: true, poNo: true, status: true },
    });
    if (!po) throw new PortalAccessError("NOT_FOUND");
    return po;
  }

  // ---------- Quotation ----------
  async submitQuotation(input: unknown) {
    const ctx = await requireSupplierPortal();
    const d = quotationSchema.parse(input);

    const rfq = await prisma.rfq.findFirst({
      where: {
        id: d.rfqId,
        companyId: ctx.companyId,
        status: "SENT",
        suppliers: { some: { supplierId: ctx.supplierId } },
      },
      include: { lines: { select: { materialId: true } } },
    });
    if (!rfq) throw new PortalAccessError("NOT_FOUND");
    if (!rfq.lines.some((l) => l.materialId === d.materialId)) {
      throw new BusinessRuleError("This material is not part of the RFQ");
    }
    if (rfq.dueDate) {
      const end = new Date(rfq.dueDate);
      end.setHours(23, 59, 59, 999);
      if (end < new Date()) throw new BusinessRuleError("The RFQ due date has passed");
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: ctx.supplierId, companyId: ctx.companyId },
      select: { currency: true },
    });
    if (!supplier) throw new PortalAccessError("NOT_FOUND");
    const currency = (d.currency ?? supplier.currency).toUpperCase();

    const latest = await prisma.supplierQuotation.findFirst({
      where: { companyId: ctx.companyId, rfqId: rfq.id, supplierId: ctx.supplierId, materialId: d.materialId },
      orderBy: { revisionNo: "desc" },
    });
    if (latest && (latest.status === "APPROVED" || latest.status === "REJECTED")) {
      throw new BusinessRuleError("This quotation is already decided");
    }

    const snap = await snapshotMoney({ amount: d.unitPrice, currency, companyId: ctx.companyId });
    const row = await prisma.supplierQuotation.create({
      data: {
        companyId: ctx.companyId,
        quotationNo: latest?.quotationNo ?? (await nextQuotationNo(ctx.companyId)),
        revisionNo: latest ? latest.revisionNo + 1 : 1,
        rfqNo: rfq.rfqNo,
        rfqId: rfq.id,
        supplierId: ctx.supplierId,
        materialId: d.materialId,
        unitPrice: d.unitPrice,
        currency,
        leadTimeDays: d.leadTimeDays,
        paymentTerms: d.paymentTerms,
        validUntil: d.validUntil,
        notes: d.notes,
        status: "RECEIVED",
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseUnitPrice: snap.baseAmount,
      },
    });
    await writeAudit({
      user: portalAuditUser(ctx),
      action: "CREATE",
      entity: "SupplierQuotation",
      entityId: row.id,
      after: { ...row, ...portalIdentity(ctx) },
      reason: "Quotation submitted via supplier portal",
    });
    return { id: row.id, quotationNo: row.quotationNo, revisionNo: row.revisionNo, status: row.status };
  }

  // ---------- Shipment update ----------
  async addShipmentUpdate(input: unknown) {
    const ctx = await requireSupplierPortal();
    const d = shipmentSchema.parse(input);
    const po = await this.ownedPo(d.poId, ctx, OPEN_PO);
    const row = await prisma.poShipmentUpdate.create({
      data: {
        companyId: ctx.companyId,
        poId: po.id,
        supplierId: ctx.supplierId,
        shippedDate: d.shippedDate,
        etaDate: d.etaDate,
        carrier: d.carrier,
        trackingNo: d.trackingNo,
        note: d.note,
        createdById: ctx.userId,
      },
    });
    await writeAudit({
      user: portalAuditUser(ctx),
      action: "CREATE",
      entity: "PoShipmentUpdate",
      entityId: row.id,
      after: { ...row, ...portalIdentity(ctx) },
      reason: "Shipment update via supplier portal",
    });
    return row;
  }

  async listShipmentUpdates(poId: string) {
    const ctx = await requireSupplierPortal();
    const po = await this.ownedPo(poId, ctx, VISIBLE_PO);
    return prisma.poShipmentUpdate.findMany({
      where: { poId: po.id, supplierId: ctx.supplierId, companyId: ctx.companyId },
      select: { id: true, shippedDate: true, etaDate: true, carrier: true, trackingNo: true, note: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ---------- Document (link register) ----------
  async addDocument(input: unknown) {
    const ctx = await requireSupplierPortal();
    const d = documentSchema.parse(input);
    const po = await this.ownedPo(d.poId, ctx, VISIBLE_PO);
    const row = await prisma.attachment.create({
      data: {
        companyId: ctx.companyId,
        entityType: "PurchaseOrder",
        entityId: po.id,
        docType: d.docType,
        fileName: d.fileName,
        originalName: d.fileName,
        storageKey: `link:${randomUUID()}`,
        storageUrl: d.url,
        access: "COMPANY",
        uploadedById: ctx.userId,
      },
      select: { id: true, docType: true, fileName: true, storageUrl: true, createdAt: true },
    });
    await writeAudit({
      user: portalAuditUser(ctx),
      action: "CREATE",
      entity: "Attachment",
      entityId: row.id,
      after: { ...row, entityType: "PurchaseOrder", entityId: po.id, ...portalIdentity(ctx) },
      reason: "Document link added via supplier portal",
    });
    return row;
  }

  // Shudhu ei supplier-er portal user-ra je document dilo, internal attachment na
  async listDocuments(poId: string) {
    const ctx = await requireSupplierPortal();
    const po = await this.ownedPo(poId, ctx, VISIBLE_PO);
    return prisma.attachment.findMany({
      where: {
        companyId: ctx.companyId,
        entityType: "PurchaseOrder",
        entityId: po.id,
        deletedAt: null,
        uploadedBy: { portalAccount: { supplierId: ctx.supplierId } },
      },
      select: { id: true, docType: true, fileName: true, storageUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ---------- Invoice status (read-only) ----------
  async listInvoices() {
    const ctx = await requireSupplierPortal();
    return prisma.supplierPi.findMany({
      where: { supplierId: ctx.supplierId },
      select: {
        id: true, piNo: true, piDate: true, amount: true, currency: true,
        po: { select: { poNo: true } },
      },
      orderBy: { piDate: "desc" },
      take: 200,
    });
  }
}

export const portalSupplierExtraService = new PortalSupplierExtraService();