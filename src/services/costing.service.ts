import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  assertCostSheetEditable,
  assertCostSheetHasItems,
  assertRejectionReason,
} from "@/lib/business-rules";
import { costItemAmount, costSheetTotals, marginFromPrice } from "@/lib/calculations";
import { assertTransition, costSheetTransitions } from "@/lib/status-rules";
import {
  approvalNeeded,
  assertApprovalAllows,
  assertRecordInScope,
  found,
  listFilter,
} from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import { snapshotMoney } from "./currency.service";
import { approvalService } from "./approval.service";
import { BaseService } from "./base.service";

const categories = [
  "FABRIC", "YARN", "TRIM", "CM", "WASH", "PRINT_EMB", "PACKING", "TESTING",
  "OVERHEAD", "COMMERCIAL", "COMMISSION", "FREIGHT", "OTHER",
] as const;

const itemSchema = z.object({
  category: z.enum(categories),
  description: z.string().min(1).max(200),
  unit: z.string().min(1).max(10).optional(),
  consumption: z.number().positive().optional(),
  unitPrice: z.number().nonnegative(),
  wastagePct: z.number().min(0).max(100).optional(),
});

const createSchema = z.object({
  styleId: z.string().min(1),
  currency: z.string().length(3).optional(),
  marginPct: z.number().min(0).lt(100).optional(),
  costType: z.enum(["PRE", "POST"]).optional(),
  orderId: z.string().optional(),
  sourceCostSheetId: z.string().optional(),
  items: z.array(itemSchema).optional(),
});

type ItemInput = z.infer<typeof itemSchema>;

function toLine(i: { consumption?: number; unitPrice: number; wastagePct?: number }) {
  return { consumption: i.consumption ?? 1, unitPrice: i.unitPrice, wastagePct: i.wastagePct ?? 0 };
}

class CostingService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const s = found(await prisma.costSheet.findUnique({ where: { id } }), "Cost sheet");
    await assertRecordInScope(user, s.companyId);
    return s;
  }

  // আইটেম বদলালে মোট খরচ, দাম আর ওই মুহূর্তের রেট আবার বসে (সেকশন ১২)
  private async recalc(id: string) {
    const sheet = found(
      await prisma.costSheet.findUnique({ where: { id }, include: { items: true } }),
      "Cost sheet"
    );
    const t = costSheetTotals(
      sheet.items.map((i) => ({
        consumption: Number(i.consumption),
        unitPrice: Number(i.unitPrice),
        wastagePct: Number(i.wastagePct),
      })),
      Number(sheet.marginPct)
    );
    const snap = await snapshotMoney({
      amount: t.quotedPrice,
      currency: sheet.currency,
      companyId: sheet.companyId,
    });
    return prisma.costSheet.update({
      where: { id },
      data: {
        totalCost: t.totalCost,
        quotedPrice: t.quotedPrice,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseQuotedPrice: snap.baseAmount,
      },
      include: { items: true },
    });
  }

  async listForStyle(styleId: string) {
    const user = await this.guard("costing.view");
    return prisma.costSheet.findMany({
      where: { ...(await listFilter(user)), styleId },
      orderBy: { version: "desc" },
    });
  }

  async get(id: string) {
    const user = await this.guard("costing.view");
    await this.load(user, id);
    return prisma.costSheet.findUnique({ where: { id }, include: { items: true, style: true } });
  }

  // Cost v1, v2, v3... প্রতি Style-এ নতুন ভার্সন
  async create(input: unknown) {
    const user = await this.guard("costing.create");
    const data = createSchema.parse(input);
    const style = found(await prisma.style.findUnique({ where: { id: data.styleId } }), "Style");
    if (style.companyId !== user.companyId) throw new BusinessRuleError("Style not found");

    if (data.costType === "POST") {
      if (!data.sourceCostSheetId || !data.orderId) {
        throw new BusinessRuleError("Post costing needs the estimate sheet and the order");
      }
      const src = await this.load(user, data.sourceCostSheetId);
      if (src.styleId !== data.styleId) throw new BusinessRuleError("Estimate sheet is for a different style");
    }

    const last = await prisma.costSheet.findFirst({
      where: { styleId: data.styleId },
      orderBy: { version: "desc" },
    });
    const items = data.items ?? [];
    const marginPct = data.marginPct ?? 0;
    const currency = (data.currency ?? "USD").toUpperCase();
    const totals = costSheetTotals(items.map(toLine), marginPct);
    const snap = await snapshotMoney({ amount: totals.quotedPrice, currency, companyId: user.companyId });

    const row = await prisma.costSheet.create({
      data: {
        companyId: user.companyId,
        styleId: data.styleId,
        version: (last?.version ?? 0) + 1,
        currency,
        marginPct,
        totalCost: totals.totalCost,
        quotedPrice: totals.quotedPrice,
        costType: data.costType,
        orderId: data.orderId,
        sourceCostSheetId: data.sourceCostSheetId,
        baseCurrency: snap.baseCurrency,
        exchangeRate: snap.exchangeRate,
        rateDate: snap.rateDate,
        baseQuotedPrice: snap.baseAmount,
        items: {
          create: items.map((i) => ({
            category: i.category,
            description: i.description,
            unit: i.unit,
            consumption: i.consumption,
            unitPrice: i.unitPrice,
            wastagePct: i.wastagePct,
            amount: costItemAmount(toLine(i)),
          })),
        },
      },
      include: { items: true },
    });
    await this.audit({ user, action: "CREATE", entity: "CostSheet", entityId: row.id, after: row });
    return row;
  }

  async addItem(sheetId: string, input: unknown) {
    const user = await this.guard("costing.edit");
    const i = itemSchema.parse(input);
    const sheet = await this.load(user, sheetId);
    await assertCostSheetEditable(sheet.id);
    await prisma.costItem.create({
      data: {
        costSheetId: sheetId,
        category: i.category,
        description: i.description,
        unit: i.unit,
        consumption: i.consumption,
        unitPrice: i.unitPrice,
        wastagePct: i.wastagePct,
        amount: costItemAmount(toLine(i)),
      },
    });
    const row = await this.recalc(sheetId);
    await this.audit({ user, action: "UPDATE", entity: "CostSheet", entityId: sheetId, after: row });
    return row;
  }

  async updateItem(itemId: string, input: unknown) {
    const user = await this.guard("costing.edit");
    const patch = itemSchema.partial().parse(input);
    const item = found(await prisma.costItem.findUnique({ where: { id: itemId } }), "Cost item");
    const sheet = await this.load(user, item.costSheetId);
    await assertCostSheetEditable(sheet.id);

    const merged = {
      consumption: patch.consumption ?? Number(item.consumption),
      unitPrice: patch.unitPrice ?? Number(item.unitPrice),
      wastagePct: patch.wastagePct ?? Number(item.wastagePct),
    };
    await prisma.costItem.update({
      where: { id: itemId },
      data: { ...patch, amount: costItemAmount(merged) },
    });
    const row = await this.recalc(sheet.id);
    await this.audit({ user, action: "UPDATE", entity: "CostSheet", entityId: sheet.id, after: row });
    return row;
  }

  async removeItem(itemId: string) {
    const user = await this.guard("costing.edit");
    const item = found(await prisma.costItem.findUnique({ where: { id: itemId } }), "Cost item");
    const sheet = await this.load(user, item.costSheetId);
    await assertCostSheetEditable(sheet.id);
    await prisma.costItem.delete({ where: { id: itemId } });
    const row = await this.recalc(sheet.id);
    await this.audit({ user, action: "UPDATE", entity: "CostSheet", entityId: sheet.id, after: row });
    return row;
  }

  async setMargin(sheetId: string, marginPct: number) {
    const user = await this.guard("costing.edit");
    const sheet = await this.load(user, sheetId);
    await assertCostSheetEditable(sheet.id);
    z.number().min(0).lt(100).parse(marginPct);
    await prisma.costSheet.update({ where: { id: sheetId }, data: { marginPct } });
    const row = await this.recalc(sheetId);
    await this.audit({ user, action: "UPDATE", entity: "CostSheet", entityId: sheetId, before: sheet, after: row });
    return row;
  }

  // দাম জানা থাকলে মার্জিন % নিজে বের হয়
  async setPrice(sheetId: string, price: number) {
    const sheet = found(await prisma.costSheet.findUnique({ where: { id: sheetId } }), "Cost sheet");
    const margin = marginFromPrice(Number(sheet.totalCost), price);
    if (margin < 0 || margin >= 100) throw new BusinessRuleError("Price must be above cost");
    return this.setMargin(sheetId, margin);
  }

  async submit(sheetId: string) {
    const user = await this.guard("costing.edit");
    const sheet = await this.load(user, sheetId);
    assertTransition(costSheetTransitions, sheet.status, "SUBMITTED");
    await assertCostSheetHasItems(sheetId);

    if (await approvalNeeded(sheet.companyId, "CostSheet")) {
      await approvalService.submit({
        entityType: "CostSheet",
        entityId: sheetId,
        title: `Costing v${sheet.version}`,
        amount: Number(sheet.quotedPrice),
      });
    }
    const row = await prisma.costSheet.update({ where: { id: sheetId }, data: { status: "SUBMITTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "CostSheet", entityId: sheetId,
      before: { status: sheet.status }, after: { status: row.status },
    });
    return row;
  }

  // নিয়ম ৮: Approved হলে costing আর বদলানো যায় না, নতুন ভার্সন লাগে
  async approve(sheetId: string) {
    const user = await this.guard("costing.approve");
    const sheet = await this.load(user, sheetId);
    assertTransition(costSheetTransitions, sheet.status, "APPROVED");
    await assertApprovalAllows(sheet.companyId, "CostSheet", sheetId);
    const row = await prisma.costSheet.update({ where: { id: sheetId }, data: { status: "APPROVED" } });
    await this.audit({
      user, action: "UPDATE", entity: "CostSheet", entityId: sheetId,
      before: { status: sheet.status }, after: { status: row.status },
    });
    return row;
  }

  async reject(sheetId: string, reason: string) {
    const user = await this.guard("costing.approve");
    assertRejectionReason(reason);
    const sheet = await this.load(user, sheetId);
    assertTransition(costSheetTransitions, sheet.status, "REJECTED");
    const row = await prisma.costSheet.update({ where: { id: sheetId }, data: { status: "REJECTED" } });
    await this.audit({
      user, action: "UPDATE", entity: "CostSheet", entityId: sheetId,
      before: { status: sheet.status }, after: { status: row.status }, reason,
    });
    return row;
  }

  async reopen(sheetId: string) {
    const user = await this.guard("costing.edit");
    const sheet = await this.load(user, sheetId);
    assertTransition(costSheetTransitions, sheet.status, "DRAFT");
    return prisma.costSheet.update({ where: { id: sheetId }, data: { status: "DRAFT" } });
  }

  // Approved sheet-এর কপি নতুন ভার্সনে (Draft)
  async newVersion(sheetId: string) {
    const user = await this.guard("costing.create");
    const src = found(
      await prisma.costSheet.findUnique({ where: { id: sheetId }, include: { items: true } }),
      "Cost sheet"
    );
    await assertRecordInScope(user, src.companyId);
    const draft = await prisma.costSheet.findFirst({ where: { styleId: src.styleId, status: "DRAFT" } });
    if (draft) throw new BusinessRuleError(`A draft version (v${draft.version}) already exists`);

    const last = await prisma.costSheet.findFirst({
      where: { styleId: src.styleId },
      orderBy: { version: "desc" },
    });
    const row = await prisma.costSheet.create({
      data: {
        companyId: src.companyId,
        styleId: src.styleId,
        version: (last?.version ?? 0) + 1,
        currency: src.currency,
        marginPct: src.marginPct,
        costType: src.costType,
        orderId: src.orderId,
        items: {
          create: src.items.map((i) => ({
            category: i.category, description: i.description, unit: i.unit,
            consumption: i.consumption, unitPrice: i.unitPrice, wastagePct: i.wastagePct, amount: i.amount,
          })),
        },
      },
    });
    const done = await this.recalc(row.id);
    await this.audit({ user, action: "CREATE", entity: "CostSheet", entityId: row.id, after: done });
    return done;
  }

  // Post costing: Estimated বনাম Actual, খাত ধরে পার্থক্য
  async variance(postSheetId: string) {
    const user = await this.guard("costing.view");
    const post = found(
      await prisma.costSheet.findUnique({ where: { id: postSheetId }, include: { items: true } }),
      "Cost sheet"
    );
    await assertRecordInScope(user, post.companyId);
    if (post.costType !== "POST" || !post.sourceCostSheetId) {
      throw new BusinessRuleError("This is not a post-costing sheet");
    }
    const est = found(
      await prisma.costSheet.findUnique({ where: { id: post.sourceCostSheetId }, include: { items: true } }),
      "Estimate sheet"
    );
    const sum = (items: { category: string; amount: unknown }[]) => {
      const m: Record<string, number> = {};
      for (const i of items) m[i.category] = (m[i.category] ?? 0) + Number(i.amount);
      return m;
    };
    const e = sum(est.items);
    const a = sum(post.items);
    const rows = [...new Set([...Object.keys(e), ...Object.keys(a)])].map((category) => ({
      category,
      estimated: e[category] ?? 0,
      actual: a[category] ?? 0,
      variance: (a[category] ?? 0) - (e[category] ?? 0),
    }));
    const totalEst = rows.reduce((s, r) => s + r.estimated, 0);
    const totalAct = rows.reduce((s, r) => s + r.actual, 0);
    return { rows, total: { estimated: totalEst, actual: totalAct, variance: totalAct - totalEst } };
  }
}

export const costingService = new CostingService();