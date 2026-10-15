import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { dhu, pareto } from "@/lib/quality-calc";
import { nextInspectionNo } from "@/lib/numbering";
import { assertFactoryInScope, factoryWhere } from "@/lib/scope";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const defectSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  category: z.string().max(60).optional(),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]).optional(),
});
const defectUpdateSchema = defectSchema.partial().extend({ isActive: z.boolean().optional() });

// Final/Pre-shipment আলাদা (AQL service)। Fabric roll-এর পরীক্ষা fabric-inspection service-এ।
const STAGES = ["INCOMING", "FABRIC", "CUTTING", "INLINE", "ENDLINE", "FINISHING"] as const;
const NEEDS_PO = ["CUTTING", "INLINE", "ENDLINE", "FINISHING"];

const occurrenceSchema = z.object({
  defectId: z.string().min(1),
  quantity: z.number().int().positive(),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]).optional(),
  rootCause: z.string().max(300).optional(),
  correctiveAction: z.string().max(300).optional(),
});

const inspectionSchema = z.object({
  stage: z.enum(STAGES),
  factoryId: z.string().optional(),
  productionOrderId: z.string().optional(),
  lineId: z.string().optional(),
  operation: z.string().max(100).optional(),
  sampleSize: z.number().int().positive(),
  defectiveQty: z.number().int().nonnegative().optional(),
  inspectedAt: z.coerce.date().optional(),
  remarks: z.string().max(500).optional(),
  occurrences: z.array(occurrenceSchema).optional(),
});

export type QualityFilter = {
  from?: Date;
  to?: Date;
  stage?: (typeof STAGES)[number];
  productionOrderId?: string;
  lineId?: string;
};

class QualityService extends BaseService {
  // ---------- Defect master ----------
  async listDefects(includeInactive = false) {
    const user = await this.guard("qc.view");
    return prisma.defect.findMany({
      where: { companyId: user.companyId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { code: "asc" },
    });
  }

  async createDefect(input: unknown) {
    const user = await this.guard("qc.manage");
    const d = defectSchema.parse(input);
    const dup = await prisma.defect.findUnique({
      where: { companyId_code: { companyId: user.companyId, code: d.code } },
    });
    if (dup) throw new BusinessRuleError("This defect code already exists");
    const row = await prisma.defect.create({ data: { ...d, companyId: user.companyId } });
    await this.audit({ user, action: "CREATE", entity: "Defect", entityId: row.id, after: row });
    return row;
  }

  async updateDefect(id: string, input: unknown) {
    const user = await this.guard("qc.manage");
    const d = defectUpdateSchema.parse(input);
    const before = found(await prisma.defect.findUnique({ where: { id } }), "Defect");
    await assertRecordInScope(user, before.companyId);
    const row = await prisma.defect.update({ where: { id }, data: d });
    await this.audit({ user, action: "UPDATE", entity: "Defect", entityId: id, before, after: row });
    return row;
  }

  // ---------- Inspection (Cutting / Inline / End-line / Finishing / Incoming QC) ----------
  async record(input: unknown) {
    const user = await this.guard("qc.inspect");
    const d = inspectionSchema.parse(input);
    const scope = await this.scopeOf(user);

    if (NEEDS_PO.includes(d.stage) && !d.productionOrderId) {
      throw new BusinessRuleError("Production order is required for this stage");
    }
    const defectiveQty = d.defectiveQty ?? 0;
    if (defectiveQty > d.sampleSize) {
      throw new BusinessRuleError("Defective pieces cannot be more than the sample size");
    }
    const occ = d.occurrences ?? [];
    const defectTotal = occ.reduce((s, o) => s + o.quantity, 0);
    if (defectiveQty > 0 && defectTotal < defectiveQty) {
      throw new BusinessRuleError("Defect quantities must add up to at least the defective pieces");
    }

    let factoryId = d.factoryId;
    let orderId: string | undefined;
    let styleId: string | undefined;
    if (d.productionOrderId) {
      const po = found(await prisma.productionOrder.findUnique({ where: { id: d.productionOrderId } }), "Production order");
      await assertRecordInScope(user, po.companyId);
      factoryId = po.factoryId;
      orderId = po.orderId;
      styleId = po.styleId;
    }
    if (!factoryId) throw new BusinessRuleError("Factory is required");
    assertFactoryInScope(scope, factoryId);

    if (d.lineId) {
      const line = found(await prisma.line.findUnique({ where: { id: d.lineId }, include: { floor: { include: { building: true } } } }), "Line");
      if (line.floor.building.factoryId !== factoryId) throw new BusinessRuleError("Line is not in this factory");
    }

    const defects = occ.length
      ? await prisma.defect.findMany({
          where: { id: { in: [...new Set(occ.map((o) => o.defectId))] }, companyId: user.companyId, isActive: true },
        })
      : [];
    const byId = new Map(defects.map((x) => [x.id, x]));
    for (const o of occ) if (!byId.has(o.defectId)) throw new BusinessRuleError("A defect was not found or is inactive");

    const row = await prisma.inspection.create({
      data: {
        companyId: user.companyId,
        factoryId,
        inspectionNo: await nextInspectionNo(user.companyId),
        stage: d.stage,
        productionOrderId: d.productionOrderId,
        orderId,
        styleId,
        lineId: d.lineId,
        operation: d.operation,
        sampleSize: d.sampleSize,
        defectiveQty,
        inspectedAt: d.inspectedAt,
        inspectorId: user.id,
        remarks: d.remarks,
        occurrences: {
          create: occ.map((o) => ({
            defectId: o.defectId,
            quantity: o.quantity,
            severity: o.severity ?? byId.get(o.defectId)!.severity,
            rootCause: o.rootCause,
            correctiveAction: o.correctiveAction,
          })),
        },
      },
      include: { occurrences: true },
    });
    await this.audit({ user, action: "CREATE", entity: "Inspection", entityId: row.id, after: row });
    return row;
  }

  async list(filter: QualityFilter = {}) {
    const user = await this.guard("qc.view");
    return prisma.inspection.findMany({
      where: this.where(await listFilter(user), await this.scopeOf(user), filter),
      include: { occurrences: { include: { defect: true } } },
      orderBy: { inspectedAt: "desc" },
      take: 200,
    });
  }

  async get(id: string) {
    const user = await this.guard("qc.view");
    const row = found(
      await prisma.inspection.findUnique({ where: { id }, include: { occurrences: { include: { defect: true } } } }),
      "Inspection"
    );
    await assertRecordInScope(user, row.companyId);
    assertFactoryInScope(await this.scopeOf(user), row.factoryId);
    return row;
  }

  private where(company: object, scope: Awaited<ReturnType<BaseService["scopeOf"]>>, f: QualityFilter) {
    return {
      ...company,
      ...factoryWhere(scope),
      ...(f.stage ? { stage: f.stage } : {}),
      ...(f.productionOrderId ? { productionOrderId: f.productionOrderId } : {}),
      ...(f.lineId ? { lineId: f.lineId } : {}),
      ...(f.from || f.to
        ? { inspectedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
        : {}),
    };
  }

  // ---------- DHU ও Defect Pareto (সেকশন ৩৪) ----------
  async summary(filter: QualityFilter = {}) {
    const user = await this.guard("qc.view");
    const where = this.where(await listFilter(user), await this.scopeOf(user), filter);
    const [agg, occ] = await Promise.all([
      prisma.inspection.aggregate({ _sum: { sampleSize: true, defectiveQty: true }, _count: true, where }),
      prisma.defectOccurrence.groupBy({
        by: ["defectId"],
        _sum: { quantity: true },
        where: { inspection: where },
      }),
    ]);
    const names = await prisma.defect.findMany({ where: { id: { in: occ.map((o) => o.defectId) } } });
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    const defects = occ.reduce((s, o) => s + (o._sum.quantity ?? 0), 0);
    const checked = agg._sum.sampleSize ?? 0;
    return {
      inspections: agg._count,
      checked,
      defectivePieces: agg._sum.defectiveQty ?? 0,
      defects,
      dhu: dhu(defects, checked),
      pareto: pareto(occ.map((o) => ({ name: nameOf.get(o.defectId) ?? "Unknown", count: o._sum.quantity ?? 0 }))),
    };
  }
}

export const qualityService = new QualityService();