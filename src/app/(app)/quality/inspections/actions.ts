"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { qualityService } from "@/services/quality.service";

type OccurrenceValues = {
  defectId: string;
  quantity: string;
  rootCause: string;
  correctiveAction: string;
};
type InspectionValues = {
  stage: string;
  factoryId: string;
  productionOrderId: string;
  lineId: string;
  operation: string;
  sampleSize: string;
  defectiveQty: string;
  remarks: string;
  occurrences: OccurrenceValues[];
};

export async function recordInspectionAction(values: InspectionValues) {
  return runAction(async () => {
    const { occurrences, sampleSize, defectiveQty, ...rest } = dropEmpty(values);
    const row = await qualityService.record({
      ...rest,
      sampleSize: Number(sampleSize),
      ...(defectiveQty !== undefined ? { defectiveQty: Number(defectiveQty) } : {}),
      occurrences: (occurrences ?? []).map((o) => {
        const { quantity, ...r } = dropEmpty(o);
        return { ...r, quantity: Number(quantity) };
      }),
    });
    return { id: row.id };
  });
}