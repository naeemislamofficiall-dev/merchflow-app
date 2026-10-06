import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BaseService } from "./base.service";

const warehouseSchema = z.object({
  factoryId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  type: z.enum(["FABRIC", "TRIM", "FINISHED_GOODS", "GENERAL"]).default("GENERAL"),
});

const binSchema = z.object({
  warehouseId: z.string().min(1),
  code: z.string().min(1).max(20),
  description: z.string().max(200).optional(),
});

class WarehouseService extends BaseService {
  async listWarehouses(factoryId: string) {
    await this.guard("warehouse.view");
    return prisma.warehouse.findMany({
      where: { factoryId },
      include: { bins: true },
      orderBy: { code: "asc" },
    });
  }

  async createWarehouse(input: unknown) {
    const user = await this.guard("warehouse.create");
    const data = warehouseSchema.parse(input);
    const row = await prisma.warehouse.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Warehouse", entityId: row.id, after: row });
    return row;
  }

  async createBin(input: unknown) {
    const user = await this.guard("warehouse.create");
    const data = binSchema.parse(input);
    const row = await prisma.bin.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Bin", entityId: row.id, after: row });
    return row;
  }
}

export const warehouseService = new WarehouseService();