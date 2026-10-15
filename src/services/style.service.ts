import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  assertBuyerActive,
  assertStyleEditable,
  assertStyleOpen,
  assertStyleReadyForApproval,
} from "@/lib/business-rules";
import { matrixTotals } from "@/lib/calculations";
import { assertTransition, styleTransitions } from "@/lib/status-rules";
import { assertRecordInScope, found, listFilter } from "@/lib/service-helpers";
import type { SessionUser } from "@/lib/permissions";
import type { StyleStatus } from "@/generated/prisma/enums";
import { BaseService } from "./base.service";

const fields = {
  name: z.string().min(1).max(150),
  seasonId: z.string().optional(),
  category: z.string().max(80).optional(),
  garmentType: z.string().max(80).optional(),
  gender: z.string().max(40).optional(),
  fabricType: z.string().max(100).optional(),
  composition: z.string().max(200).optional(),
  gsm: z.number().int().positive().optional(),
  construction: z.string().max(200).optional(),
  washType: z.string().max(100).optional(),
  print: z.string().max(200).optional(),
  embroidery: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  developmentOwnerId: z.string().optional(),
};

const createSchema = z.object({
  styleNo: z.string().min(1).max(40),
  buyerId: z.string().min(1),
  ...fields,
});
const editSchema = z.object(fields).partial();

const revisionSchema = z.object({
  styleId: z.string().min(1),
  changes: editSchema,
  reason: z.string().min(3).max(500),
  attachmentUrl: z.string().max(500).optional(),
});

const colorSchema = z.object({
  styleId: z.string().min(1),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(60),
  sortOrder: z.number().int().optional(),
});
const sizeSchema = z.object({
  styleId: z.string().min(1),
  label: z.string().min(1).max(20),
  sortOrder: z.number().int().optional(),
});
const cellsSchema = z.array(
  z.object({ colorId: z.string(), sizeId: z.string(), quantity: z.number().int().nonnegative() })
);
const docSchema = z.object({
  styleId: z.string().min(1),
  title: z.string().min(1).max(150),
  docType: z.enum([
    "TECH_PACK", "MEASUREMENT_SHEET", "ARTWORK", "CONSTRUCTION_SHEET", "BUYER_COMMENTS",
    "REFERENCE_IMAGE", "CAD_FILE", "APPROVED_SAMPLE_PHOTO", "TEST_REPORT",
  ]),
  version: z.string().max(20).optional(),
  fileUrl: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

class StyleService extends BaseService {
  private async load(user: SessionUser, id: string) {
    const style = found(await prisma.style.findUnique({ where: { id } }), "Style");
    await assertRecordInScope(user, style.companyId);
    return style;
  }

  private async checkRefs(user: SessionUser, d: { seasonId?: string; developmentOwnerId?: string }) {
    if (d.seasonId) {
      const s = await prisma.season.findUnique({ where: { id: d.seasonId } });
      if (!s || s.companyId !== user.companyId) throw new BusinessRuleError("Season not found");
    }
    if (d.developmentOwnerId) {
      const u = await prisma.user.findUnique({ where: { id: d.developmentOwnerId } });
      if (!u || u.companyId !== user.companyId) throw new BusinessRuleError("Development owner not found");
    }
  }

  async list(filter: { buyerId?: string; status?: StyleStatus } = {}) {
    const user = await this.guard("style.view");
    return prisma.style.findMany({
      where: {
        ...(await listFilter(user)),
        ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: { buyer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // Sample status দেখাতে সর্বশেষ sample-ও আনা হয় (সেকশন ৮)
  async get(id: string) {
    const user = await this.guard("style.view");
    await this.load(user, id);
    return prisma.style.findUnique({
      where: { id },
      include: {
        buyer: true,
        colors: { orderBy: { sortOrder: "asc" } },
        sizes: { orderBy: { sortOrder: "asc" } },
        techPacks: { orderBy: { createdAt: "desc" } },
        revisions: { orderBy: { revisionNo: "desc" } },
        sampleRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  async create(input: unknown) {
    const user = await this.guard("style.create");
    const data = createSchema.parse(input);
    const buyer = await assertBuyerActive(data.buyerId);
    if (buyer.companyId !== user.companyId) throw new BusinessRuleError("Buyer not found");
    await this.checkRefs(user, data);
    const dup = await prisma.style.findUnique({
      where: { companyId_styleNo: { companyId: user.companyId, styleNo: data.styleNo } },
    });
    if (dup) throw new BusinessRuleError("Style number already exists");

    const season = data.seasonId
      ? await prisma.season.findUnique({ where: { id: data.seasonId } })
      : null;
    const row = await prisma.style.create({
      data: { ...data, season: season?.name, companyId: user.companyId, createdById: user.id },
    });
    await this.audit({ user, action: "CREATE", entity: "Style", entityId: row.id, after: row });
    return row;
  }

  // Draft ও Development অবস্থায় সরাসরি বদলানো যায়। Approved হলে revision লাগবে।
  async update(id: string, input: unknown) {
    const user = await this.guard("style.edit");
    const before = await this.load(user, id);
    await assertStyleEditable(id);
    const data = editSchema.parse(input);
    await this.checkRefs(user, data);
    const row = await prisma.style.update({ where: { id }, data });
    await this.audit({ user, action: "UPDATE", entity: "Style", entityId: id, before, after: row });
    return row;
  }

  async changeStatus(id: string, to: StyleStatus) {
    const user = await this.guard("style.edit");
    if (to === "APPROVED") await this.guard("style.approve");
    const style = await this.load(user, id);
    assertTransition(styleTransitions, style.status, to);
    if (to === "APPROVED") await assertStyleReadyForApproval(id);

    const row = await prisma.$transaction(async (tx) => {
      const s = await tx.style.update({ where: { id }, data: { status: to } });
      if (to === "APPROVED") {
        // অনুমোদনের মুহূর্তের অবস্থা revision হিসেবে রাখা হয়
        const last = await tx.styleRevision.findFirst({
          where: { styleId: id },
          orderBy: { revisionNo: "desc" },
        });
        await tx.styleRevision.create({
          data: {
            styleId: id,
            revisionNo: (last?.revisionNo ?? 0) + 1,
            changeNote: "Style approved",
            createdById: user.id,
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });
      }
      return s;
    });
    await this.audit({
      user, action: "UPDATE", entity: "Style", entityId: id,
      before: { status: style.status }, after: { status: row.status },
    });
    return row;
  }

  // Approved style বদলাতে চাইলে আগে প্রস্তাব (revision) জমা দিতে হয়, সরাসরি বদলানো যায় না
  async proposeRevision(input: unknown) {
    const user = await this.guard("style.edit");
    const data = revisionSchema.parse(input);
    const style = await this.load(user, data.styleId);
    if (style.status !== "APPROVED") {
      throw new BusinessRuleError("Only an approved style needs a revision. Edit it directly");
    }
    await this.checkRefs(user, data.changes);

    const changedFields: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, to] of Object.entries(data.changes)) {
      if (to === undefined) continue;
      changedFields[key] = { from: (style as Record<string, unknown>)[key] ?? null, to };
    }
    if (Object.keys(changedFields).length === 0) throw new BusinessRuleError("Nothing to change");

    const last = await prisma.styleRevision.findFirst({
      where: { styleId: style.id },
      orderBy: { revisionNo: "desc" },
    });
    const row = await prisma.styleRevision.create({
      data: {
        styleId: style.id,
        revisionNo: (last?.revisionNo ?? 0) + 1,
        changedFields: JSON.parse(JSON.stringify(changedFields)),
        reason: data.reason,
        attachmentUrl: data.attachmentUrl,
        createdById: user.id,
      },
    });
    await this.audit({ user, action: "CREATE", entity: "StyleRevision", entityId: row.id, after: row });
    return row;
  }

  // অনুমোদন হলে তবেই বদল Style-এ বসে
  async approveRevision(revisionId: string) {
    const user = await this.guard("style.approve");
    const rev = found(
      await prisma.styleRevision.findUnique({ where: { id: revisionId }, include: { style: true } }),
      "Revision"
    );
    await assertRecordInScope(user, rev.style.companyId);
    if (rev.approvedAt) throw new BusinessRuleError("Revision is already approved");

    const raw = (rev.changedFields ?? {}) as Record<string, { to: unknown }>;
    const patch = editSchema.parse(
      Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.to]))
    );
    const row = await prisma.$transaction(async (tx) => {
      await tx.style.update({ where: { id: rev.styleId }, data: patch });
      return tx.styleRevision.update({
        where: { id: revisionId },
        data: { approvedById: user.id, approvedAt: new Date() },
      });
    });
    await this.audit({
      user, action: "UPDATE", entity: "StyleRevision", entityId: revisionId, before: rev, after: row,
    });
    return row;
  }

  // ---------- রং, সাইজ, ম্যাট্রিক্স (সেকশন ৯) ----------

  async addColor(input: unknown) {
    const user = await this.guard("style.edit");
    const data = colorSchema.parse(input);
    const style = await this.load(user, data.styleId);
    await assertStyleOpen(style.id);
    const row = await prisma.styleColor.create({ data });
    await this.audit({ user, action: "CREATE", entity: "StyleColor", entityId: row.id, after: row });
    return row;
  }

  async addSize(input: unknown) {
    const user = await this.guard("style.edit");
    const data = sizeSchema.parse(input);
    const style = await this.load(user, data.styleId);
    await assertStyleOpen(style.id);
    const row = await prisma.styleSize.create({ data });
    await this.audit({ user, action: "CREATE", entity: "StyleSize", entityId: row.id, after: row });
    return row;
  }

  // অর্ডারে ব্যবহার হয়ে থাকলে রং মোছা যাবে না
  async removeColor(colorId: string) {
    const user = await this.guard("style.edit");
    const color = found(await prisma.styleColor.findUnique({ where: { id: colorId } }), "Color");
    await this.load(user, color.styleId);
    await assertStyleEditable(color.styleId);
    if ((await prisma.orderLineQty.count({ where: { colorId } })) > 0) {
      throw new BusinessRuleError("This color is used in an order");
    }
    await prisma.styleColor.delete({ where: { id: colorId } });
    await this.audit({ user, action: "DELETE", entity: "StyleColor", entityId: colorId, before: color });
  }

  async removeSize(sizeId: string) {
    const user = await this.guard("style.edit");
    const size = found(await prisma.styleSize.findUnique({ where: { id: sizeId } }), "Size");
    await this.load(user, size.styleId);
    await assertStyleEditable(size.styleId);
    if ((await prisma.orderLineQty.count({ where: { sizeId } })) > 0) {
      throw new BusinessRuleError("This size is used in an order");
    }
    await prisma.styleSize.delete({ where: { id: sizeId } });
    await this.audit({ user, action: "DELETE", entity: "StyleSize", entityId: sizeId, before: size });
  }

  // Style-এর পরিকল্পিত রং × সাইজ পরিমাণ (প্রতি cell-এর জন্য আলাদা SKU বানানো হয় না)
  async setMatrix(styleId: string, input: unknown) {
    const user = await this.guard("style.edit");
    const cells = cellsSchema.parse(input);
    const style = await this.load(user, styleId);
    await assertStyleOpen(style.id);

    const [colors, sizes] = await Promise.all([
      prisma.styleColor.findMany({ where: { styleId }, select: { id: true } }),
      prisma.styleSize.findMany({ where: { styleId }, select: { id: true } }),
    ]);
    const colorIds = new Set(colors.map((c) => c.id));
    const sizeIds = new Set(sizes.map((s) => s.id));
    for (const c of cells) {
      if (!colorIds.has(c.colorId) || !sizeIds.has(c.sizeId)) {
        throw new BusinessRuleError("Color and size must belong to this style");
      }
    }
    await prisma.$transaction(
      cells.map((c) =>
        prisma.styleMatrixQty.upsert({
          where: { colorId_sizeId: { colorId: c.colorId, sizeId: c.sizeId } },
          update: { quantity: c.quantity },
          create: { colorId: c.colorId, sizeId: c.sizeId, quantity: c.quantity },
        })
      )
    );
    await this.audit({ user, action: "UPDATE", entity: "StyleMatrix", entityId: styleId, after: cells });
    return this.getMatrix(styleId);
  }

  // রং-ধরে, সাইজ-ধরে আর মোট যোগফল সহ
  async getMatrix(styleId: string) {
    const user = await this.guard("style.view");
    await this.load(user, styleId);
    const cells = await prisma.styleMatrixQty.findMany({
      where: { color: { styleId } },
      select: { colorId: true, sizeId: true, quantity: true },
    });
    return { cells, ...matrixTotals(cells) };
  }

  // ---------- ডকুমেন্ট লাইব্রেরি (সেকশন ৮) ----------
  // নতুন ভার্সন সবসময় নতুন সারি, পুরনো সারি কখনো ওভাররাইট হয় না

  async addDocument(input: unknown) {
    const user = await this.guard("style.edit");
    const data = docSchema.parse(input);
    const style = await this.load(user, data.styleId);
    await assertStyleOpen(style.id);
    const row = await prisma.techPack.create({ data });
    await this.audit({ user, action: "CREATE", entity: "TechPack", entityId: row.id, after: row });
    return row;
  }
}

export const styleService = new StyleService();