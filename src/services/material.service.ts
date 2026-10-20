import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const categorySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

const materialSchema = z.object({
  categoryId: z.string().min(1),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  unit: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  reorderPoint: z.number().nonnegative().optional(),
});

// কোড বদলানো যায় না: BOM, PO, GRN সবাই এই material-এ জোড়া থাকে
const materialUpdateSchema = materialSchema.omit({ code: true }).partial();

class MaterialService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const m = found(await prisma.material.findUnique({ where: { id } }), "Material");
    await assertRecordInScope(user, m.companyId);
    return m;
  }

  private async loadCategory(user: SessionUser, id: string) {
    const c = found(await prisma.materialCategory.findUnique({ where: { id } }), "Material category");
    await assertRecordInScope(user, c.companyId);
    return c;
  }

  async listCategories() {
    const user = await this.guard("material.view");
    return prisma.materialCategory.findMany({
      where: await listFilter(user),
      orderBy: { name: "asc" },
      include: { _count: { select: { materials: true } } },
    });
  }

  async createCategory(input: unknown) {
    const user = await this.guard("material.create");
    const data = categorySchema.parse(input);
    const dup = await prisma.materialCategory.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: data.code } },
    });
    if (dup) throw new BusinessRuleError("Category code already exists");
    const row = await prisma.materialCategory.create({ data: { ...data, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "MaterialCategory", entityId: row.id, after: row });
    return row;
  }

  async list(filter: { categoryId?: string; activeOnly?: boolean } = {}) {
    const user = await this.guard("material.view");
    return prisma.material.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.activeOnly ? { status: "ACTIVE" as const } : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("material.view");
    await this.load(user, id);
    return found(
      await prisma.material.findUnique({ where: { id }, include: { category: true } }),
      "Material"
    );
  }

  async create(input: unknown) {
    const user = await this.guard("material.create");
    const data = materialSchema.parse(input);
    await this.loadCategory(user, data.categoryId);
    const dup = await prisma.material.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: data.code } },
    });
    if (dup) throw new BusinessRuleError("Material code already exists");
    const row = await prisma.material.create({ data: { ...data, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Material", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("material.edit");
    const before = await this.load(user, id);
    const data = materialUpdateSchema.parse(input);
    if (data.categoryId) await this.loadCategory(user, data.categoryId);
    const row = await prisma.material.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "Material", entityId: id, before, after: row });
    return row;
  }

  // নিষ্ক্রিয় করলে নতুন BOM/PO-তে নেওয়া যায় না, পুরনো লেনদেন জোড়া থাকে
  async setActive(id: string, active: boolean) {
    const user = await this.guard("material.edit");
    const before = await this.load(user, id);
    const row = await prisma.material.update({
      where: { id },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });
    await this.audit({ user, action: "UPDATE", entity: "Material", entityId: id, before, after: row });
    return row;
  }
}

export const materialService = new MaterialService();