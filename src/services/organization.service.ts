import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertFactoryInScope } from "@/lib/scope";
import { BusinessRuleError } from "@/lib/business-rules";
import { BaseService } from "./base.service";

const buildingSchema = z.object({
  factoryId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

const floorSchema = z.object({
  buildingId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

const departmentSchema = z.object({
  factoryId: z.string().min(1),
  floorId: z.string().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

const lineSchema = z.object({
  floorId: z.string().min(1),
  departmentId: z.string().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

class OrganizationService extends BaseService {
  async listBuildings(factoryId: string) {
    const user = await this.guard("organization.view");
    assertFactoryInScope(await this.scopeOf(user), factoryId);
    return prisma.building.findMany({
      where: { factoryId },
      include: { floors: true },
      orderBy: { code: "asc" },
    });
  }

  async createBuilding(input: unknown) {
    const user = await this.guard("organization.create");
    const data = buildingSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), data.factoryId);
    const row = await prisma.building.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Building", entityId: row.id, after: row });
    return row;
  }

  async createFloor(input: unknown) {
    const user = await this.guard("organization.create");
    const data = floorSchema.parse(input);
    const building = await prisma.building.findUnique({ where: { id: data.buildingId } });
    if (!building) throw new BusinessRuleError("Building not found");
    assertFactoryInScope(await this.scopeOf(user), building.factoryId);
    const row = await prisma.floor.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Floor", entityId: row.id, after: row });
    return row;
  }

  async createDepartment(input: unknown) {
    const user = await this.guard("organization.create");
    const data = departmentSchema.parse(input);
    assertFactoryInScope(await this.scopeOf(user), data.factoryId);
    if (data.floorId) {
      const floor = await prisma.floor.findUnique({
        where: { id: data.floorId },
        include: { building: true },
      });
      if (!floor || floor.building.factoryId !== data.factoryId) {
        throw new BusinessRuleError("Floor does not belong to this factory");
      }
    }
    const row = await prisma.department.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Department", entityId: row.id, after: row });
    return row;
  }

  async createLine(input: unknown) {
    const user = await this.guard("organization.create");
    const data = lineSchema.parse(input);
    const floor = await prisma.floor.findUnique({
      where: { id: data.floorId },
      include: { building: true },
    });
    if (!floor) throw new BusinessRuleError("Floor not found");
    assertFactoryInScope(await this.scopeOf(user), floor.building.factoryId);
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept || dept.factoryId !== floor.building.factoryId) {
        throw new BusinessRuleError("Department does not belong to this factory");
      }
    }
    const row = await prisma.line.create({ data });
    await this.audit({ user, action: "CREATE", entity: "Line", entityId: row.id, after: row });
    return row;
  }
}

export const organizationService = new OrganizationService();