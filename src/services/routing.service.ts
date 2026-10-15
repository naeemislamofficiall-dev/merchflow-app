import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const PROCESSES = ["CUTTING", "PRINTING", "EMBROIDERY", "SEWING", "WASHING", "FINISHING", "PACKING"] as const;

const stepsSchema = z.array(z.enum(PROCESSES)).min(2);

const createSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  steps: stepsSchema,
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  steps: stepsSchema.optional(),
  isActive: z.boolean().optional(),
});

function assertNoDuplicates(steps: string[]) {
  if (new Set(steps).size !== steps.length) {
    throw new BusinessRuleError("A process can appear only once in a route");
  }
}

class RoutingService extends BaseService {
  async list() {
    const user = await this.guard("routing.view");
    return prisma.productionRoute.findMany({
      where: { companyId: user.companyId },
      include: { steps: { orderBy: { seq: "asc" } } },
      orderBy: { code: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("routing.view");
    const row = found(
      await prisma.productionRoute.findUnique({
        where: { id },
        include: { steps: { orderBy: { seq: "asc" } } },
      }),
      "Route"
    );
    await assertRecordInScope(user, row.companyId);
    return row;
  }

  // উদাহরণ: steps = ["CUTTING", "SEWING", "WASHING", "FINISHING", "PACKING"]
  async create(input: unknown) {
    const user = await this.guard("routing.manage");
    const d = createSchema.parse(input);
    assertNoDuplicates(d.steps);
    const dup = await prisma.productionRoute.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: d.code } },
    });
    if (dup) throw new BusinessRuleError("A route with this code already exists");

    const row = await prisma.productionRoute.create({
      data: {
        companyId: user.companyId,
        code: d.code,
        name: d.name,
        steps: { create: d.steps.map((process, i) => ({ seq: i + 1, process })) },
      },
      include: { steps: { orderBy: { seq: "asc" } } },
    });
    await this.audit({ user, action: "CREATE", entity: "ProductionRoute", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("routing.manage");
    const d = updateSchema.parse(input);
    const route = found(
      await prisma.productionRoute.findUnique({ where: { id }, include: { steps: { orderBy: { seq: "asc" } } } }),
      "Route"
    );
    await assertRecordInScope(user, route.companyId);

    if (d.steps) {
      assertNoDuplicates(d.steps);
      // চলমান কাজ থাকলে ধাপ বদলানো যাবে না
      const running = await prisma.productionOrder.count({
        where: { routeId: id, status: { in: ["PLANNED", "RELEASED", "IN_PROGRESS", "PAUSED"] } },
      });
      if (running > 0) {
        throw new BusinessRuleError("This route is used by open production orders. Create a new route instead");
      }
    }

    const row = await prisma.$transaction(async (tx) => {
      if (d.steps) {
        await tx.productionRouteStep.deleteMany({ where: { routeId: id } });
        await tx.productionRouteStep.createMany({
          data: d.steps.map((process, i) => ({ routeId: id, seq: i + 1, process })),
        });
      }
      return tx.productionRoute.update({
        where: { id },
        data: { name: d.name, isActive: d.isActive },
        include: { steps: { orderBy: { seq: "asc" } } },
      });
    });
    await this.audit({ user, action: "UPDATE", entity: "ProductionRoute", entityId: id, before: route, after: row });
    return row;
  }
}

export const routingService = new RoutingService();