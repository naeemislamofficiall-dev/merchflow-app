import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertTransition, capaTransitions } from "@/lib/status-rules";
import { nextCapaNo } from "@/lib/numbering";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { CapaStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const createSchema = z.object({
  title: z.string().min(3).max(150),
  category: z.string().max(60).optional(), // High sewing defect, Fabric shade problem, Packing mismatch ...
  problem: z.string().min(3).max(1000),
  factoryId: z.string().optional(),
  sourceType: z.string().max(40).optional(), // Inspection / AqlInspection
  sourceId: z.string().optional(),
  ownerId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

// এক ধাপ এগোনোর সময় যা যা দেওয়া যায়
const advanceSchema = z.object({
  rootCause: z.string().max(1000).optional(),
  correctiveAction: z.string().max(1000).optional(),
  preventiveAction: z.string().max(1000).optional(),
  ownerId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  verificationNote: z.string().max(1000).optional(),
});

class CapaService extends BaseService {
  private async load(id: string) {
    const row = found(await prisma.capa.findUnique({ where: { id } }), "CAPA");
    return row;
  }

  async create(input: unknown) {
    const user = await this.guard("capa.create");
    const d = createSchema.parse(input);
    if (d.ownerId) await this.assertUser(user.companyId, d.ownerId);
    const row = await prisma.capa.create({
      data: { ...d, companyId: user.companyId, capaNo: await nextCapaNo(user.companyId), createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "Capa", entityId: row.id, after: row });
    return row;
  }

  private async assertUser(companyId: string, userId: string) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u || u.companyId !== companyId) throw new BusinessRuleError("Owner not found");
  }

  async list(filter: { status?: CapaStatus; ownerId?: string } = {}) {
    const user = await this.guard("capa.view");
    return prisma.capa.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async get(id: string) {
    const user = await this.guard("capa.view");
    const row = await this.load(id);
    await assertRecordInScope(user, row.companyId);
    return row;
  }

  // OPEN → ROOT_CAUSE → ACTION → VERIFICATION → CLOSED। প্রতি ধাপে দরকারি ঘর না ভরলে আটকায়।
  async advance(id: string, to: CapaStatus, input: unknown = {}) {
    const user = await this.guard(to === "CLOSED" ? "capa.close" : "capa.edit");
    const d = advanceSchema.parse(input);
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertTransition(capaTransitions, before.status, to);
    if (d.ownerId) await this.assertUser(user.companyId, d.ownerId);

    const next = { ...before, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) };
    if (to === "ACTION") {
      if (!next.rootCause) throw new BusinessRuleError("Record the root cause first");
      if (!next.correctiveAction) throw new BusinessRuleError("A corrective action is required");
      if (!next.ownerId) throw new BusinessRuleError("An owner is required");
      if (!next.dueDate) throw new BusinessRuleError("A due date is required");
    }
    if (to === "ROOT_CAUSE" && !next.problem) throw new BusinessRuleError("Problem is required");
    if (to === "CLOSED" && !next.verificationNote) {
      throw new BusinessRuleError("Write the verification note before closing");
    }

    const row = await prisma.capa.update({
      where: { id },
      data: {
        ...d,
        status: to,
        ...(to === "CLOSED" ? { closedAt: new Date(), verifiedById: user.id } : {}),
      },
    });
    await this.audit({
      user, action: "UPDATE", entity: "Capa", entityId: id,
      before: { status: before.status }, after: { status: row.status },
    });
    return row;
  }

  async cancel(id: string, reason: string) {
    const user = await this.guard("capa.edit");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const before = await this.load(id);
    await assertRecordInScope(user, before.companyId);
    assertTransition(capaTransitions, before.status, "CANCELLED");
    const row = await prisma.capa.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason } });
    await this.audit({
      user, action: "UPDATE", entity: "Capa", entityId: id,
      before: { status: before.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  // QA dashboard: এখনো বন্ধ হয়নি এমন CAPA, দেরি হওয়াগুলো আলাদা
  async pending() {
    const user = await this.guard("capa.view");
    const open = await prisma.capa.findMany({
      where: { ...(await listFilter(user)), status: { notIn: ["CLOSED", "CANCELLED"] } },
      select: { id: true, dueDate: true },
    });
    const now = new Date();
    return { open: open.length, overdue: open.filter((c) => c.dueDate && c.dueDate < now).length };
  }
}

export const capaService = new CapaService();