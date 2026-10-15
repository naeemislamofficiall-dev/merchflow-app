import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertFactoryInScope } from "@/lib/scope";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";

const warehouseSchema = z.object({
  factoryId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
    type: z
    .enum([
      "RAW_MATERIAL", "FABRIC", "TRIMS", "ACCESSORIES", "CHEMICAL",
      "GENERAL_STORE", "WIP", "FINISHED_GOODS", "TRIM", "GENERAL",
    ])
    .optional(), // ডিফল্ট ("GENERAL") Prisma দেয়
});

const binSchema = z.object({
  warehouseId: z.string().min(1),
  code: z.string().min(1).max(20),
  description: z.string().max(200).optional(),
});

class WarehouseService extends BaseService {
  async listWarehouses(factoryId: string) {
    const user = await this.guard("warehouse.view");
    assertFactoryInScope(await this.scopeOf(user), factoryId);
    return prisma.warehouse.findMany({
      where: { factoryId },
      include: { bins: true },
      orderBy: { code: "asc" },
    });
  }

  async createWarehouse(input: unknown) {
    const user = await this.guard("warehouse.create");
    const data = warehouseSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), data.factoryId);
    const row = await prisma.warehouse.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Warehouse", entityId: row.id, after: row });
    return row;
  }

  async createBin(input: unknown) {
    const user = await this.guard("warehouse.create");
    const data = binSchema.parse(input);
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw new BusinessRuleError("Warehouse not found");
    assertFactoryInScope(await this.scopeOf(user), warehouse.factoryId);
    const row = await prisma.bin.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Bin", entityId: row.id, after: row });
    return row;
  }
}

export const warehouseService = new WarehouseService();