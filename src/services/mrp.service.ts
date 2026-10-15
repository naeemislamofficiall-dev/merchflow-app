import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertBomApproved, BusinessRuleError } from "@/lib/business-rules";
import { grossRequirement, netRequirement } from "@/lib/calculations";
import { nextPrNo } from "@/lib/numbering";
import { getStockPosition, TX_OPTIONS } from "@/lib/stock";
import { BaseService } from "./base.service";

const runSchema = z.object({
  bomId: z.string().min(1),
  orderQty: z.number().int().positive(),
  orderId: z.string().optional(),
});

class MrpService extends BaseService {
  // নেট = মোট দরকার − স্টক − আসন্ন সরবরাহ + সংরক্ষিত স্টক (সেকশন ১৪)
  // স্টক = ব্যবহারযোগ্য হাতের মাল, আসন্ন = পাঠানো PO-র বাকি, সংরক্ষিত = অন্য অর্ডারের জন্য রাখা
  async run(input: unknown) {
    const user = await this.guard("mrp.run");
    const data = runSchema.parse(input);
    const bom = await assertBomApproved(data.bomId);
    const items = await prisma.bomItem.findMany({ where: { bomId: bom.id } });

    const run = await prisma.$transaction(async (tx) => {
      const r = await tx.mrpRun.create({
        data: {
          companyId: user.companyId,
          bomId: bom.id,
          orderId: data.orderId,
          orderQty: data.orderQty,
        },
      });
      for (const it of items) {
        const gross = grossRequirement(
          { consumption: Number(it.consumption), wastagePct: Number(it.wastagePct) },
          data.orderQty
        );
        // BOM আইটেমে material না জোড়া থাকলে স্টক জানা যায় না, শূন্য ধরা হয়
        const pos = it.materialId
          ? await getStockPosition(tx, user.companyId, it.materialId, data.orderId)
          : { stock: 0, incoming: 0, reserved: 0 };
        const net = netRequirement(gross, pos.stock, pos.incoming, pos.reserved);
        await tx.mrpLine.create({
          data: {
            mrpRunId: r.id,
            bomItemId: it.id,
            grossQty: gross,
            stockQty: pos.stock,
            incomingQty: pos.incoming,
            reservedQty: pos.reserved,
            netQty: net,
          },
        });
      }
      return r;
    }, TX_OPTIONS);

    await this.audit({ user, action: "CREATE", entity: "MrpRun", entityId: run.id, after: run });
    return run;
  }

  // ঘাটতির মালামাল থেকে Purchase Requisition বানায়
  async createPr(mrpRunId: string) {
    const user = await this.guard("pr.create");
    const run = await prisma.mrpRun.findUnique({
      where: { id: mrpRunId },
      include: { bom: true, lines: { include: { bomItem: true } } },
    });
    if (!run || run.companyId !== user.companyId) throw new BusinessRuleError("MRP run not found");

    const already = await prisma.purchaseRequisition.findFirst({ where: { mrpRunId } });
    if (already) throw new BusinessRuleError(`PR ${already.prNo} already created for this MRP run`);

    const short = run.lines.filter((l) => Number(l.netQty) > 0);
    if (short.length === 0) throw new BusinessRuleError("No shortage found. PR is not needed");

    const unlinked = short.filter((l) => !l.bomItem.materialId);
    if (unlinked.length > 0) {
      throw new BusinessRuleError(
        `Link a material to these BOM items first: ${unlinked.map((l) => l.bomItem.itemName).join(", ")}`
      );
    }

    const prNo = await nextPrNo(user.companyId);
    const pr = await prisma.purchaseRequisition.create({
      data: {
        companyId: user.companyId,
        prNo,
        source: "MRP",
        orderId: run.orderId,
        styleId: run.bom.styleId,
        mrpRunId: run.id,
        reason: "Generated from MRP",
        createdById: user.id,
        lines: {
          create: short.map((l) => ({
            materialId: l.bomItem.materialId as string,
            quantity: l.netQty,
            unit: l.bomItem.unit,
          })),
        },
      },
      include: { lines: true },
    });
    await this.audit({ user, action: "CREATE", entity: "PurchaseRequisition", entityId: pr.id, after: pr });
    return pr;
  }
}

export const mrpService = new MrpService();