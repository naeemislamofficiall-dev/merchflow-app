"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { aqlService } from "@/services/aql.service";

type PlanValues = {
  inspectionLevel: string;
  lotSize: string;
  aqlMajor: string;
  aqlMinor: string;
};
type CreateValues = PlanValues & {
  stage: string;
  orderId: string;
  productionOrderId: string;
  remarks: string;
};

function plan(v: PlanValues) {
  const { lotSize, aqlMajor, aqlMinor, ...rest } = dropEmpty(v);
  return {
    ...rest,
    lotSize: Number(lotSize),
    ...(aqlMajor !== undefined ? { aqlMajor: Number(aqlMajor) } : {}),
    ...(aqlMinor !== undefined ? { aqlMinor: Number(aqlMinor) } : {}),
  };
}

export async function previewAqlAction(values: PlanValues) {
  return runAction(async () => {
    const p = await aqlService.preview(plan(values));
    return {
      sampleSize: p.sampleSize,
      acceptMajor: p.acceptMajor,
      rejectMajor: p.rejectMajor,
      acceptMinor: p.acceptMinor,
      rejectMinor: p.rejectMinor,
    };
  });
}

export async function createAqlAction(values: CreateValues) {
  return runAction(async () => {
    const { stage, orderId, productionOrderId, remarks, ...p } = values;
    const row = await aqlService.create({
      ...plan(p),
      ...dropEmpty({ stage, orderId, productionOrderId, remarks }),
    });
    return { id: row.id };
  });
}

export async function recordAqlAction(id: string, critical: number, major: number, minor: number) {
  return runAction(async () => {
    await aqlService.record(id, { foundCritical: critical, foundMajor: major, foundMinor: minor });
    return { id };
  });
}

export async function holdAqlAction(id: string, reason: string) {
  return runAction(async () => {
    await aqlService.hold(id, reason);
    return { id };
  });
}

export async function overrideAqlAction(id: string, reason: string) {
  return runAction(async () => {
    await aqlService.override(id, reason);
    return { id };
  });
}