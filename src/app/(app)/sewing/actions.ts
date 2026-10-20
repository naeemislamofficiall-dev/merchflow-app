"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { sewingService } from "@/services/sewing.service";

type SewingValues = {
  productionOrderId: string;
  lineId: string;
  logDate: string;
  hour: string;
  target: string;
  output: string;
  reject: string;
  rework: string;
  downtimeMinutes: string;
  downtimeReason: string;
  operators: string;
  remarks: string;
};

export async function saveSewingLogAction(values: SewingValues) {
  return runAction(async () => {
    const { hour, target, output, reject, rework, downtimeMinutes, operators, ...rest } = dropEmpty(values);
    const row = await sewingService.save({
      ...rest,
      hour: Number(hour),
      target: Number(target),
      output: Number(output),
      ...(reject !== undefined ? { reject: Number(reject) } : {}),
      ...(rework !== undefined ? { rework: Number(rework) } : {}),
      ...(downtimeMinutes !== undefined ? { downtimeMinutes: Number(downtimeMinutes) } : {}),
      ...(operators !== undefined ? { operators: Number(operators) } : {}),
    });
    return { id: row.id };
  });
}