"use server";

import { runAction } from "@/lib/action-result";
import { ppcService } from "@/services/ppc.service";

type AllocateValues = {
  productionOrderId: string;
  lineId: string;
  date: string;
  plannedQty: string;
  remarks: string;
};

export async function allocatePpcAction(v: AllocateValues) {
  return runAction(async () => {
    const r = await ppcService.allocate({
      productionOrderId: v.productionOrderId,
      lineId: v.lineId,
      date: v.date,
      plannedQty: Number(v.plannedQty),
      ...(v.remarks ? { remarks: v.remarks } : {}),
    });
    return { id: r.allocation.id, warnings: r.warnings };
  });
}

export async function movePpcAction(id: string, v: { lineId: string; date: string; plannedQty: string }) {
  return runAction(async () => {
    const r = await ppcService.update(id, {
      lineId: v.lineId,
      date: v.date,
      plannedQty: Number(v.plannedQty),
    });
    return { id: r.allocation.id, warnings: r.warnings };
  });
}

export async function releasePpcAction(id: string) {
  return runAction(async () => {
    await ppcService.release(id);
    return { id, warnings: [] as string[] };
  });
}

export async function cancelPpcAction(id: string, reason: string) {
  return runAction(async () => {
    await ppcService.cancel(id, reason);
    return { id, warnings: [] as string[] };
  });
}

export async function addHolidayAction(v: { factoryId: string; date: string; reason: string }) {
  return runAction(async () => {
    const row = await ppcService.addHoliday(v);
    return { id: row.id, warnings: [] as string[] };
  });
}

export async function removeHolidayAction(id: string) {
  return runAction(async () => {
    await ppcService.removeHoliday(id);
    return { id, warnings: [] as string[] };
  });
}
