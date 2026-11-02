import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const seasonSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(100),
});

class SeasonService extends BaseService {
  async list() {
    const user = await this.guard("season.view");
    return prisma.season.findMany({
      where: await listFilter(user),
      include: { _count: { select: { styles: true, orders: true } } },
      orderBy: { code: "asc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("season.view");
    const row = found(await prisma.season.findUnique({ where: { id } }), "Season");
    await assertRecordInScope(user, row.companyId);
    return row;
  }

  async create(input: unknown) {
    const user = await this.guard("season.create");
    const d = seasonSchema.parse(input);
    const dup = await prisma.season.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: d.code } },
    });
    if (dup) throw new BusinessRuleError("This season code already exists");
    const row = await prisma.season.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Season", entityId: row.id, after: row });
    return row;
  }

  async update(id: string, input: unknown) {
    const user = await this.guard("season.edit");
    const d = seasonSchema.parse(input);
    const before = found(await prisma.season.findUnique({ where: { id } }), "Season");
    await assertRecordInScope(user, before.companyId);
    if (d.code !== before.code) {
      const dup = await prisma.season.findUnique({
        where: { companyId_code: { companyId: before.companyId, code: d.code } },
      });
      if (dup) throw new BusinessRuleError("This season code already exists");
    }
    const row = await prisma.season.update({ where: { id }, data: d });
    await this.audit({ user, action: "UPDATE", entity: "Season", entityId: id, before, after: row });
    return row;
  }
}

export const seasonService = new SeasonService();