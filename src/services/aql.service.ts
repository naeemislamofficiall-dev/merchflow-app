import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { AQL_LEVELS, aqlResult, aqlSampleSize, defaultAccept } from "@/lib/quality-calc";
import { nextAqlNo } from "@/lib/numbering";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const planSchema = z.object({
  inspectionLevel: z.enum(AQL_LEVELS).optional(), // না দিলে "II"
  lotSize: z.number().int().positive(),
  aqlMajor: z.number().min(0).optional(), // না দিলে 2.5
  aqlMinor: z.number().min(0).optional(), // না দিলে 4.0
  // বায়ারের নিজস্ব স্ট্যান্ডার্ড হলে হাতে দিন (Reject = Accept + 1)
  sampleSize: z.number().int().positive().optional(),
  acceptMajor: z.number().int().nonnegative().optional(),
  acceptMinor: z.number().int().nonnegative().optional(),
});

const createSchema = planSchema.extend({
  stage: z.enum(["FINAL", "PRESHIPMENT"]),
  orderId: z.string().min(1),
  productionOrderId: z.string().optional(),
  factoryId: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

const recordSchema = z.object({
  foundCritical: z.number().int().nonnegative(),
  foundMajor: z.number().int().nonnegative(),
  foundMinor: z.number().int().nonnegative(),
  remarks: z.string().max(500).optional(),
});

// নমুনা আর accept/reject ঠিক করে। না পারলে (অজানা AQL) স্পষ্ট বার্তা দেয়।
function buildPlan(p: z.infer<typeof planSchema>) {
  const level = p.inspectionLevel ?? "II";
  const aqlMajor = p.aqlMajor ?? 2.5;
  const aqlMinor = p.aqlMinor ?? 4;
  const sampleSize = Math.min(p.sampleSize ?? aqlSampleSize(level, p.lotSize), p.lotSize);
  const acceptMajor = p.acceptMajor ?? defaultAccept(aqlMajor, sampleSize);
  const acceptMinor = p.acceptMinor ?? defaultAccept(aqlMinor, sampleSize);
  if (acceptMajor === null || acceptMinor === null) {
    throw new BusinessRuleError("This AQL value is not built in. Please enter the accept numbers from your buyer's chart");
  }
  return {
    inspectionLevel: level, lotSize: p.lotSize, sampleSize, aqlMajor, aqlMinor,
    acceptMajor, rejectMajor: acceptMajor + 1, acceptMinor, rejectMinor: acceptMinor + 1,
  };
}

// শিপমেন্ট আটকানোর নিয়ম (নিয়ম ১১): অর্ডারের সর্বশেষ Final AQL
// PASS না হলে আর override না থাকলে আটকাবে। কোনো Final AQL না থাকলে আটকায় না (readiness-এ সতর্কতা দেখায়)।
export async function finalInspectionGate(companyId: string, orderIds: string[]) {
  const out: { orderId: string; result: string | null; overridden: boolean; blocked: boolean }[] = [];
  for (const orderId of orderIds) {
    const last = await prisma.aqlInspection.findFirst({
      where: { companyId, orderId, stage: "FINAL" },
      orderBy: { createdAt: "desc" },
    });
    const overridden = !!last?.overrideById;
    out.push({
      orderId,
      result: last?.result ?? null,
      overridden,
      blocked: !!last && last.result !== "PASS" && !overridden,
    });
  }
  return out;
}

class AqlService extends BaseService {
  // নমুনা কত হবে তার আগাম হিসাব (কিছু সেভ করে না)
  async preview(input: unknown) {
    await this.guard("aql.view");
    return buildPlan(planSchema.parse(input));
  }

  async create(input: unknown) {
    const user = await this.guard("aql.inspect");
    const d = createSchema.parse(input);
    const order = found(await prisma.order.findUnique({ where: { id: d.orderId } }), "Order");
    await assertRecordInScope(user, order.companyId);

    let factoryId = d.factoryId;
    let styleId: string | undefined;
    if (d.productionOrderId) {
      const po = found(await prisma.productionOrder.findUnique({ where: { id: d.productionOrderId } }), "Production order");
      if (po.orderId !== order.id) throw new BusinessRuleError("This production order belongs to another order");
      factoryId = po.factoryId;
      styleId = po.styleId;
    }
    if (!factoryId) throw new BusinessRuleError("Factory is required");
    assertFactoryInScope(await this.scopeOf(user), factoryId);

    const plan = buildPlan(d);
    const row = await prisma.aqlInspection.create({
      data: {
        ...plan,
        companyId: user.companyId,
        factoryId,
        inspectionNo: await nextAqlNo(user.companyId),
        stage: d.stage,
        orderId: order.id,
        buyerId: order.buyerId,
        styleId,
        productionOrderId: d.productionOrderId,
        remarks: d.remarks,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "AqlInspection", entityId: row.id, after: row });
    return row;
  }

  private async load(id: string) {
    const user = await this.guard("aql.view");
    const row = found(await prisma.aqlInspection.findUnique({ where: { id } }), "AQL inspection");
    await assertRecordInScope(user, row.companyId);
    assertFactoryInScope(await this.scopeOf(user), row.factoryId);
    return { user, row };
  }

  async get(id: string) {
    return (await this.load(id)).row;
  }

  async list(filter: { orderId?: string; result?: "PASS" | "FAIL" | "HOLD" } = {}) {
    const user = await this.guard("aql.view");
    return prisma.aqlInspection.findMany({
      where: {
        ...(await listFilter(user)),
        ...factoryWhere(await this.scopeOf(user)),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
        ...(filter.result ? { result: filter.result } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  // পরীক্ষার ফল বসানো। একবার বসলে আর বদলায় না (রিপোর্ট); ভুল হলে নতুন পরীক্ষা করুন।
  async record(id: string, input: unknown) {
    const user = await this.guard("aql.inspect");
    const d = recordSchema.parse(input);
    const { row } = await this.load(id);
    if (row.foundMajor !== null) throw new BusinessRuleError("The result is already recorded. Create a new inspection to correct it");
    const result = aqlResult({ ...d, rejectMajor: row.rejectMajor, rejectMinor: row.rejectMinor });
    const saved = await prisma.aqlInspection.update({
      where: { id },
      data: { ...d, result, inspectedAt: new Date(), inspectorId: user.id },
    });
    await this.audit({ user, action: "UPDATE", entity: "AqlInspection", entityId: id, before: row, after: saved });
    return saved;
  }

  // HOLD-এ রাখা (কারণ লাগে)
  async hold(id: string, reason: string) {
    const user = await this.guard("aql.inspect");
    if (!reason || reason.trim().length < 3) throw new BusinessRuleError("A reason is required");
    const { row } = await this.load(id);
    const saved = await prisma.aqlInspection.update({
      where: { id },
      data: { result: "HOLD", remarks: [row.remarks, `HOLD: ${reason}`].filter(Boolean).join(" | ") },
    });
    await this.audit({ user, action: "UPDATE", entity: "AqlInspection", entityId: id, before: row, after: saved, reason });
    return saved;
  }

  // FAIL/HOLD হলেও শিপমেন্টের অনুমতি (শুধু aql.override permission-ওয়ালা)
  async override(id: string, reason: string) {
    const user = await this.guard("aql.override");
    if (!reason || reason.trim().length < 5) throw new BusinessRuleError("A reason of at least 5 characters is required");
    const { row } = await this.load(id);
    if (row.result === "PASS") throw new BusinessRuleError("A passed inspection needs no override");
    const saved = await prisma.aqlInspection.update({
      where: { id },
      data: { overrideById: user.id, overrideReason: reason, overriddenAt: new Date() },
    });
    await this.audit({ user, action: "UPDATE", entity: "AqlInspection", entityId: id, before: row, after: saved, reason });
    return saved;
  }

  // AQL pass rate (QA dashboard): যেগুলোর ফল বসেছে তার মধ্যে PASS কত %
  async passRate(from?: Date) {
    const user = await this.guard("aql.view");
    const where = {
      ...(await listFilter(user)),
      ...factoryWhere(await this.scopeOf(user)),
      foundMajor: { not: null },
      ...(from ? { inspectedAt: { gte: from } } : {}),
    };
    const [total, passed] = await Promise.all([
      prisma.aqlInspection.count({ where }),
      prisma.aqlInspection.count({ where: { ...where, result: "PASS" } }),
    ]);
    return { total, passed, passRatePct: total > 0 ? Math.round((passed / total) * 1000) / 10 : null };
  }
}

export const aqlService = new AqlService();