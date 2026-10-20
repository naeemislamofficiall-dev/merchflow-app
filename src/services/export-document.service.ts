import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { DOC_TYPES } from "@/lib/export-doc-types";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { ExportDocStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const createSchema = z.object({
  docType: z.enum(DOC_TYPES),
  docNo: z.string().max(60).optional(),
  shipmentId: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  remarks: z.string().max(500).optional(),
});

// কোন অবস্থা থেকে কোথায় যাওয়া যাবে
const FLOW: Record<ExportDocStatus, ExportDocStatus[]> = {
  DRAFT: ["READY"],
  READY: ["DRAFT", "SUBMITTED"],
  SUBMITTED: ["READY", "HANDED_OVER"],
  HANDED_OVER: [],
};

class ExportDocumentService extends BaseService {
  private async load(id: string, permission: string) {
    const user = await this.guard(permission);
    const doc = found(await prisma.exportDocument.findUnique({ where: { id } }), "Document");
    await assertRecordInScope(user, doc.companyId);
    return { user, doc };
  }

  async list() {
    const user = await this.guard("commercial.view");
    return prisma.exportDocument.findMany({
      where: await listFilter(user),
      include: { shipment: { select: { id: true, shipmentNo: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ফর্মের ড্রপডাউনের জন্য
  async shipmentOptions() {
    const user = await this.guard("commercial.view");
    return prisma.shipment.findMany({
      where: await listFilter(user),
      select: { id: true, shipmentNo: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async create(input: unknown) {
    const user = await this.guard("commercial.create");
    const data = createSchema.parse(input);
    if (data.shipmentId) {
      const s = found(await prisma.shipment.findUnique({ where: { id: data.shipmentId } }), "Shipment");
      await assertRecordInScope(user, s.companyId);
    }
    const row = await prisma.exportDocument.create({
      data: {
        companyId: user.companyId,
        docType: data.docType,
        docNo: data.docNo,
        shipmentId: data.shipmentId,
        issueDate: data.issueDate,
        amount: data.amount,
        currency: data.currency?.toUpperCase(),
        remarks: data.remarks,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "ExportDocument", entityId: row.id, after: row });
    return row;
  }

  async setStatus(
    id: string,
    to: ExportDocStatus,
    handover?: { handoverTo?: string; handoverDate?: Date }
  ) {
    const { user, doc } = await this.load(id, "commercial.edit");
    if (!FLOW[doc.status].includes(to)) {
      throw new BusinessRuleError(`Cannot move from ${doc.status} to ${to}`);
    }
    if (to === "HANDED_OVER" && (!handover?.handoverTo || handover.handoverTo.trim().length < 2)) {
      throw new BusinessRuleError("Say who it was handed over to");
    }
    const row = await prisma.exportDocument.update({
      where: { id },
      data: {
        status: to,
        ...(to === "HANDED_OVER"
          ? { handoverTo: handover?.handoverTo?.trim(), handoverDate: handover?.handoverDate ?? new Date() }
          : {}),
      },
    });
    await this.audit({ user, action: "UPDATE", entity: "ExportDocument", entityId: id, before: doc, after: row });
    return row;
  }

  async remove(id: string) {
    const { user, doc } = await this.load(id, "commercial.edit");
    if (doc.status !== "DRAFT") throw new BusinessRuleError("Only a draft can be deleted");
    await prisma.exportDocument.delete({ where: { id } });
    await this.audit({ user, action: "DELETE", entity: "ExportDocument", entityId: id, before: doc });
  }
}

export const exportDocumentService = new ExportDocumentService();