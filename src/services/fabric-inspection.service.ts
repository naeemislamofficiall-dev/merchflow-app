import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, assertRejectionReason } from "@/lib/business-rules";
import { loadWarehouse } from "@/lib/stock";
import { found } from "@/lib/service-helpers";
import { BaseService } from "./base.service";

const inspectSchema = z.object({
  rollNo: z.string().min(1),
  method: z.string().max(50).optional(), // 4-point, 10-point ইত্যাদি
  widthCm: z.number().positive().optional(),
  gsm: z.number().positive().optional(),
  length: z.number().positive().optional(),
  defectPoints: z.number().int().nonnegative().optional(),
  defects: z
    .array(
      z.object({
        type: z.string().min(1).max(60),
        points: z.number().int().positive(),
        count: z.number().int().positive().optional(),
      })
    )
    .optional(),
  shade: z.string().max(50).optional(),
  shrinkagePct: z.number().min(-50).max(50).optional(),
  result: z.enum(["ACCEPTED", "CONDITIONAL", "REJECTED"]),
  remarks: z.string().max(500).optional(),
});

class FabricInspectionService extends BaseService {
  private async loadRoll(rollNo: string) {
    const user = await this.guard("qc.view");
    const roll = found(
      await prisma.fabricRoll.findUnique({
        where: { companyId_rollNo: { companyId: user.companyId, rollNo } },
      }),
      "Roll"
    );
    await loadWarehouse(user, roll.warehouseId);
    return { user, roll };
  }

  async listForRoll(rollNo: string) {
    const { roll } = await this.loadRoll(rollNo);
    return prisma.fabricInspection.findMany({
      where: { rollId: roll.id },
      orderBy: { inspectedAt: "desc" },
    });
  }

  // রোল পরীক্ষার ফল। ফল রোলের অবস্থায় বসে। Rejected হলে এর সংরক্ষণ আপনা-আপনি ছেড়ে দেওয়া হয়।
  async inspect(input: unknown) {
    const user = await this.guard("qc.inspect");
    const d = inspectSchema.parse(input);
    const { roll } = await this.loadRoll(d.rollNo);

    if (d.result !== "ACCEPTED") assertRejectionReason(d.remarks); // কারণ ছাড়া Conditional/Rejected নয়
    if (d.length !== undefined && d.length <= 0) throw new BusinessRuleError("Length must be positive");

    const points =
      d.defectPoints ?? (d.defects ?? []).reduce((s, x) => s + x.points * (x.count ?? 1), 0);

    const row = await prisma.$transaction(async (tx) => {
      const insp = await tx.fabricInspection.create({
        data: {
          rollId: roll.id,
          inspectorId: user.id,
          method: d.method,
          widthCm: d.widthCm,
          gsm: d.gsm,
          length: d.length,
          defectPoints: points,
          defects: d.defects ? JSON.parse(JSON.stringify(d.defects)) : undefined,
          shade: d.shade,
          shrinkagePct: d.shrinkagePct,
          result: d.result,
          remarks: d.remarks,
        },
      });
      await tx.fabricRoll.update({ where: { id: roll.id }, data: { inspectionStatus: d.result } });
      if (d.result === "REJECTED") {
        await tx.stockReservation.updateMany({
          where: { rollId: roll.id, status: "ACTIVE" },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
      }
      return insp;
    });

    await this.audit({
      user, action: "CREATE", entity: "FabricInspection", entityId: row.id, after: row,
      reason: d.remarks,
    });
    return row;
  }
}

export const fabricInspectionService = new FabricInspectionService();