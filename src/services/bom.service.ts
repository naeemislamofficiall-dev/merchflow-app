import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  assertBomEditable,
  assertBomReadyForApproval,
  assertSupplierActive,
} from "@/lib/business-rules";
import { grossRequirement } from "@/lib/calculations";
import { assertTransition, bomTransitions } from "@/lib/status-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const itemSchema = z.object({
  itemType: z.enum(["FABRIC", "YARN", "TRIM", "PACKING"]),
  itemName: z.string().min(1).max(150),
  subCategory: z.string().max(60).optional(), // Thread, Button, Zipper, Label, Poly, Carton...
  materialId: z.string().optional(),
  supplierId: z.string().optional(),
  rate: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  effectiveDate: z.coerce.date().optional(),
  unit: z.string().min(1).max(10).optional(),
  consumption: z.number().positive().optional(),
  wastagePct: z.number().min(0).max(100).optional(),
});

class BomService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const bom = found(await prisma.bom.findUnique({ where: { id } }), "BOM");
    await assertRecordInScope(user, bom.companyId);
    return bom;
  }

  private async checkRefs(user: SessionUser, d: { materialId?: string; supplierId?: string }) {
    if (d.materialId) {
      const m = await prisma.material.findUnique({ where: { id: d.materialId } });
      if (!m || m.companyId !== user.companyId) throw new BusinessRuleError("Material not found");
    }
    if (d.supplierId) {
      const s = await assertSupplierActive(d.supplierId);
      if (s.companyId !== user.companyId) throw new BusinessRuleError("Supplier not found");
    }
  }
    // সব BOM-এর তালিকা (BOM পেজের জন্য)
  async list() {
    const user = await this.guard("bom.view");
    return prisma.bom.findMany({
      where: await listFilter(user),
      include: { style: { select: { styleNo: true, name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForStyle(styleId: string) {
    const user = await this.guard("bom.view");
    return prisma.bom.findMany({
      where: { ...(await listFilter(user)), styleId },
      orderBy: { version: "desc" },
    });
  }

  // প্রতি আইটেমের "Net requirement" (এক পিসের জন্য, অপচয় সহ) দেখানো হয়
  async get(id: string) {
    const user = await this.guard("bom.view");
    await this.load(user, id);
    const bom = found(
      await prisma.bom.findUnique({
        where: { id },
        include: { items: { include: { material: true, supplier: true } }, style: true },
      }),
      "BOM"
    );
    return {
      ...bom,
      items: bom.items.map((i) => ({
        ...i,
        requiredPerUnit: grossRequirement(
          { consumption: Number(i.consumption), wastagePct: Number(i.wastagePct) },
          1
        ),
      })),
    };
  }

  async create(styleId: string) {
    const user = await this.guard("bom.create");
    const style = found(await prisma.style.findUnique({ where: { id: styleId } }), "Style");
    if (style.companyId !== user.companyId) throw new BusinessRuleError("Style not found");
    const open = await prisma.bom.findFirst({ where: { styleId, status: "DRAFT" } });
    if (open) throw new BusinessRuleError(`A draft BOM (v${open.version}) already exists`);
    const last = await prisma.bom.findFirst({ where: { styleId }, orderBy: { version: "desc" } });
    const row = await prisma.bom.create({
      data: { companyId: user.companyId, styleId, version: (last?.version ?? 0) + 1 },
    });
    await this.audit({ user, action: "CREATE", entity: "Bom", entityId: row.id, after: row });
    return row;
  }

  async addItem(bomId: string, input: unknown) {
    const user = await this.guard("bom.edit");
    const data = itemSchema.parse(input);
    const bom = await this.load(user, bomId);
    await assertBomEditable(bom.id);
    await this.checkRefs(user, data);
    const row = await prisma.bomItem.create({ data: { ...data, bomId } });
    await this.audit({ user, action: "CREATE", entity: "BomItem", entityId: row.id, after: row });
    return row;
  }

  async updateItem(itemId: string, input: unknown) {
    const user = await this.guard("bom.edit");
    const patch = itemSchema.partial().parse(input);
    const item = found(await prisma.bomItem.findUnique({ where: { id: itemId } }), "BOM item");
    const bom = await this.load(user, item.bomId);
    await assertBomEditable(bom.id);
    await this.checkRefs(user, patch);
    const row = await prisma.bomItem.update({ where: { id: itemId }, data: patch });
    await this.audit({ user, action: "UPDATE", entity: "BomItem", entityId: itemId, before: item, after: row });
    return row;
  }

  async removeItem(itemId: string) {
    const user = await this.guard("bom.edit");
    const item = found(await prisma.bomItem.findUnique({ where: { id: itemId } }), "BOM item");
    const bom = await this.load(user, item.bomId);
    await assertBomEditable(bom.id);
    await prisma.bomItem.delete({ where: { id: itemId } });
    await this.audit({ user, action: "DELETE", entity: "BomItem", entityId: itemId, before: item });
  }

  // Approve হলে একই Style-এর আগের Approved ভার্সন Archived হয়ে যায়
  async approve(bomId: string) {
    const user = await this.guard("bom.approve");
    const bom = await this.load(user, bomId);
    assertTransition(bomTransitions, bom.status, "APPROVED");
    await assertBomReadyForApproval(bomId);

    const row = await prisma.$transaction(async (tx) => {
      await tx.bom.updateMany({
        where: { styleId: bom.styleId, status: "APPROVED", id: { not: bomId } },
        data: { status: "ARCHIVED" },
      });
      return tx.bom.update({ where: { id: bomId }, data: { status: "APPROVED" } });
    });
    await this.audit({
      user, action: "UPDATE", entity: "Bom", entityId: bomId,
      before: { status: bom.status }, after: { status: row.status },
    });
    return row;
  }

  // নিয়ম ৭: Approved BOM চুপচাপ বদলানো যায় না। কপি করে নতুন Draft ভার্সনে কাজ করতে হয়।
  async newRevision(bomId: string) {
    const user = await this.guard("bom.create");
    const src = found(
      await prisma.bom.findUnique({ where: { id: bomId }, include: { items: true } }),
      "BOM"
    );
    await assertRecordInScope(user, src.companyId);
    const open = await prisma.bom.findFirst({ where: { styleId: src.styleId, status: "DRAFT" } });
    if (open) throw new BusinessRuleError(`A draft BOM (v${open.version}) already exists`);
    const last = await prisma.bom.findFirst({ where: { styleId: src.styleId }, orderBy: { version: "desc" } });

    const row = await prisma.bom.create({
      data: {
        companyId: src.companyId,
        styleId: src.styleId,
        version: (last?.version ?? 0) + 1,
        items: {
          create: src.items.map((i) => ({
            itemType: i.itemType, itemName: i.itemName, subCategory: i.subCategory,
            materialId: i.materialId, supplierId: i.supplierId, rate: i.rate, currency: i.currency,
            effectiveDate: i.effectiveDate, unit: i.unit, consumption: i.consumption,
            wastagePct: i.wastagePct,
          })),
        },
      },
      include: { items: true },
    });
    await this.audit({ user, action: "CREATE", entity: "Bom", entityId: row.id, after: row });
    return row;
  }
}

export const bomService = new BomService();