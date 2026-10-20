"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { fabricInspectionService } from "@/services/fabric-inspection.service";

type InspectValues = {
  rollNo: string;
  method: string;
  widthCm: string;
  gsm: string;
  length: string;
  defectPoints: string;
  shade: string;
  shrinkagePct: string;
  result: string;
  remarks: string;
};

export async function inspectRollAction(values: InspectValues) {
  return runAction(async () => {
    const { widthCm, gsm, length, defectPoints, shrinkagePct, ...rest } = dropEmpty(values);
    const row = await fabricInspectionService.inspect({
      ...rest,
      ...(widthCm !== undefined ? { widthCm: Number(widthCm) } : {}),
      ...(gsm !== undefined ? { gsm: Number(gsm) } : {}),
      ...(length !== undefined ? { length: Number(length) } : {}),
      ...(defectPoints !== undefined ? { defectPoints: Number(defectPoints) } : {}),
      ...(shrinkagePct !== undefined ? { shrinkagePct: Number(shrinkagePct) } : {}),
    });
    return { id: row.id };
  });
}