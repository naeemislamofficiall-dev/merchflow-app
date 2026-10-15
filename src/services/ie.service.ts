import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { lineBalance, totalSmv } from "@/lib/ie-calc";
import { found } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { BaseService } from "./base.service";

const opSchema = z.object({
  name: z.string().min(1).max(100),
  machineType: z.string().max(60).optional(),
  smv: z.number().positive().max(999),
  skillLevel: z.string().max(40).optional(),
  operators: z.number().positive().max(99).optional(), // না দিলে ১
});

const bulletinSchema = z.object({
  styleId: z.string().min(1),
  operations: z.array(opSchema).min(1),
});

const balanceSchema = z.object({
  styleId: z.string().min(1),
  targetPerHour: z.number().positive(),
  efficiencyPct: z.number().positive().max(100).optional(), // না দিলে ১০০
});

class IeService extends BaseService {
  private async style(user: SessionUser, styleId: string) {
    const s = found(await prisma.style.findUnique({ where: { id: styleId } }), "Style");
    if (s.companyId !== user.companyId) throw new BusinessRuleError("Style not found");
    return s;
  }

  private async load(styleId: string) {
    const rows = await prisma.productionOperation.findMany({
      where: { styleId },
      orderBy: { seq: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      seq: r.seq,
      name: r.name,
      machineType: r.machineType,
      skillLevel: r.skillLevel,
      smv: Number(r.smv),
      operators: Number(r.operators),
    }));
  }

  // Operation Bulletin + মোট SMV (SAM)
  async bulletin(styleId: string) {
    const user = await this.guard("ie.view");
    await this.style(user, styleId);
    const operations = await this.load(styleId);
    return { styleId, totalSmv: totalSmv(operations), operations };
  }

  // পুরো bulletin একবারে বদলে দেয় (পুরনো কাজগুলো সরে নতুন তালিকা বসে)
  async saveBulletin(input: unknown) {
    const user = await this.guard("ie.manage");
    const d = bulletinSchema.parse(input);
    await this.style(user, d.styleId);
    const before = await this.load(d.styleId);

    await prisma.$transaction(async (tx) => {
      await tx.productionOperation.deleteMany({ where: { styleId: d.styleId } });
      await tx.productionOperation.createMany({
        data: d.operations.map((o, i) => ({
          styleId: d.styleId,
          seq: i + 1,
          name: o.name,
          machineType: o.machineType,
          smv: o.smv,
          skillLevel: o.skillLevel,
          operators: o.operators,
        })),
      });
    });

    const after = await this.load(d.styleId);
    await this.audit({
      user, action: "UPDATE", entity: "ProductionOperation", entityId: d.styleId, before, after,
    });
    return { styleId: d.styleId, totalSmv: totalSmv(after), operations: after };
  }

  // লাইন ব্যালেন্সিং: লক্ষ্য ও দক্ষতা দিলে প্রতিটা কাজের চাপ আর bottleneck বলে
  async lineBalance(input: unknown) {
    const user = await this.guard("ie.view");
    const d = balanceSchema.parse(input);
    await this.style(user, d.styleId);
    const ops = await this.load(d.styleId);
    if (ops.length === 0) throw new BusinessRuleError("Add the operation bulletin for this style first");
    return lineBalance(ops, { targetPerHour: d.targetPerHour, efficiencyPct: d.efficiencyPct });
  }
}

export const ieService = new IeService();