"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { cuttingService } from "@/services/cutting.service";

type CutPlanValues = {
  productionOrderId: string;
  color: string;
  materialId: string;
  sizeRatio: Record<string, string>;
  plannedPlies: string;
  fabricRequirement: string;
  remarks: string;
};

export async function createCutPlanAction(values: CutPlanValues) {
  return runAction(async () => {
    const { sizeRatio, plannedPlies, fabricRequirement, ...rest } = dropEmpty(values);
    const ratio: Record<string, number> = {};
    for (const [size, v] of Object.entries(sizeRatio ?? {})) {
      const n = Number(v);
      if (v !== "" && n > 0) ratio[size] = n;
    }
    const row = await cuttingService.createPlan({
      ...rest,
      sizeRatio: ratio,
      plannedPlies: Number(plannedPlies),
      ...(fabricRequirement !== undefined ? { fabricRequirement: Number(fabricRequirement) } : {}),
    });
    return { id: row.id };
  });
}

export async function reserveFabricAction(id: string) {
  return runAction(async () => {
    await cuttingService.reserveFabric(id);
    return { id };
  });
}

export async function cancelCutPlanAction(id: string, reason: string) {
  return runAction(async () => {
    await cuttingService.cancelPlan(id, reason);
    return { id };
  });
}

export async function addLayAction(values: {
  cutPlanId: string;
  plies: string;
  markerLength: string;
  markerWidthCm: string;
  markerEfficiencyPct: string;
}) {
  return runAction(async () => {
    const { plies, markerLength, markerWidthCm, markerEfficiencyPct, cutPlanId } = dropEmpty(values);
    const row = await cuttingService.addLay({
      cutPlanId,
      plies: Number(plies),
      ...(markerLength !== undefined ? { markerLength: Number(markerLength) } : {}),
      ...(markerWidthCm !== undefined ? { markerWidthCm: Number(markerWidthCm) } : {}),
      ...(markerEfficiencyPct !== undefined ? { markerEfficiencyPct: Number(markerEfficiencyPct) } : {}),
    });
    return { id: row.id };
  });
}

export async function markCutAction(layId: string, actualPlies: string, fabricUsed: string) {
  return runAction(async () => {
    await cuttingService.markCut({
      layId,
      ...(actualPlies ? { actualPlies: Number(actualPlies) } : {}),
      ...(fabricUsed ? { fabricUsed: Number(fabricUsed) } : {}),
    });
    return { id: layId };
  });
}

export async function generateBundlesAction(layId: string, bundleSize: number) {
  return runAction(async () => {
    const rows = await cuttingService.generateBundles({ layId, bundleSize });
    return { count: rows.length };
  });
}