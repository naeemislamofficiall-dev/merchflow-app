import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { assertTransition, sampleTransitions } from "@/lib/status-rules";
import { assertApprovalAllows } from "@/lib/service-helpers";
import { PortalAccessError } from "@/lib/portal-scope";
import { portalAuditUser, portalIdentity, requireBuyerPortal } from "@/lib/portal-session";

const orderSelect = {
  id: true,
  orderNo: true,
  buyerPoNo: true,
  status: true,
  currency: true,
  orderDate: true,
  shipDate: true,
  lines: {
    select: {
      id: true,
      quantity: true,
      shipDate: true,
      style: { select: { styleNo: true, name: true } },
    },
  },
} as const;

const sampleSelect = {
  id: true,
  sampleNo: true,
  sampleType: true,
  quantity: true,
  status: true,
  dueDate: true,
  sentDate: true,
  courier: true,
  trackingNo: true,
  revisionCount: true,
  buyerResponse: true,
  style: { select: { styleNo: true, name: true } },
  approvals: { select: { round: true, decision: true, comments: true, decidedAt: true }, orderBy: { round: "asc" } },
} as const;

const decideSchema = z.object({
  sampleId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().max(1000).optional(),
});

class PortalBuyerService {
  async listStyles() {
    const ctx = await requireBuyerPortal();
    return prisma.style.findMany({
      where: { buyerId: ctx.buyerId, companyId: ctx.companyId },
      select: {
        id: true, styleNo: true, name: true, season: true, category: true, status: true,
        garmentType: true, gender: true, fabricType: true, composition: true, description: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listOrders() {
    const ctx = await requireBuyerPortal();
    return prisma.order.findMany({
      where: { buyerId: ctx.buyerId, companyId: ctx.companyId, status: { not: "DRAFT" } },
      select: orderSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getOrder(id: string) {
    const ctx = await requireBuyerPortal();
    const order = await prisma.order.findFirst({
      where: { id, buyerId: ctx.buyerId, companyId: ctx.companyId, status: { not: "DRAFT" } },
      select: orderSelect,
    });
    if (!order) throw new PortalAccessError("NOT_FOUND");
    return order;
  }

  async listSamples() {
    const ctx = await requireBuyerPortal();
    return prisma.sampleRequest.findMany({
      where: { companyId: ctx.companyId, style: { buyerId: ctx.buyerId } },
      select: sampleSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getSample(id: string) {
    const ctx = await requireBuyerPortal();
    const s = await prisma.sampleRequest.findFirst({
      where: { id, companyId: ctx.companyId, style: { buyerId: ctx.buyerId } },
      select: sampleSelect,
    });
    if (!s) throw new PortalAccessError("NOT_FOUND");
    return s;
  }

  async listTna() {
    const ctx = await requireBuyerPortal();
    return prisma.tnaPlan.findMany({
      where: {
        companyId: ctx.companyId,
        OR: [{ order: { buyerId: ctx.buyerId } }, { style: { buyerId: ctx.buyerId } }],
      },
      select: {
        id: true,
        shipDate: true,
        style: { select: { styleNo: true, name: true } },
        order: { select: { orderNo: true } },
        tasks: {
          select: { id: true, name: true, plannedDate: true, revisedDate: true, actualDate: true, status: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      take: 100,
    });
  }

  async listShipments() {
    const ctx = await requireBuyerPortal();
    return prisma.shipment.findMany({
      where: { buyerId: ctx.buyerId, companyId: ctx.companyId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      select: {
        id: true, shipmentNo: true, status: true, mode: true, exFactoryDate: true,
        plannedShipDate: true, actualShipDate: true, deliveredAt: true,
        port: true, destination: true, vesselOrFlight: true, blNo: true, invoiceNo: true,
      },
      orderBy: { plannedShipDate: "desc" },
      take: 200,
    });
  }

  // Buyer decision: sampleService.decide-er shob niyom (BUYER_REVIEW, transition, approval gate, rejection comment)
  async decideSample(input: unknown) {
    const ctx = await requireBuyerPortal();
    const d = decideSchema.parse(input);

    const s = await prisma.sampleRequest.findFirst({
      where: { id: d.sampleId, companyId: ctx.companyId, style: { buyerId: ctx.buyerId } },
    });
    if (!s) throw new PortalAccessError("NOT_FOUND");
    if (s.status !== "BUYER_REVIEW") throw new BusinessRuleError("The sample must be in buyer review first");
    assertTransition(sampleTransitions, s.status, d.decision);
    if (d.decision === "APPROVED") await assertApprovalAllows(s.companyId, "SampleRequest", s.id);
    if (d.decision === "REJECTED") assertRejectionReason(d.comments);

    const round = (await prisma.sampleApproval.count({ where: { sampleId: s.id } })) + 1;
    const row = await prisma.$transaction(async (tx) => {
      await tx.sampleApproval.create({
        data: { sampleId: s.id, round, decision: d.decision, comments: d.comments },
      });
      return tx.sampleRequest.update({
        where: { id: s.id },
        data: { status: d.decision, buyerResponse: d.comments },
      });
    });

    await writeAudit({
      user: portalAuditUser(ctx),
      action: "UPDATE",
      entity: "SampleRequest",
      entityId: s.id,
      before: { status: s.status },
      after: { status: row.status, round, ...portalIdentity(ctx) },
      reason: d.comments ?? "Buyer decision via portal",
    });
    return { sampleId: s.id, status: row.status, round };
  }
}

export const portalBuyerService = new PortalBuyerService();