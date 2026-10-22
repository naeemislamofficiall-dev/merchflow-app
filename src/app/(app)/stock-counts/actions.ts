"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { stockCountService } from "@/services/stock-count.service";

export async function createStockCountAction(values: { warehouseId: string; remarks: string }) {
  return runAction(async () => {
    const row = await stockCountService.create(dropEmpty(values));
    return { id: row.id };
  });
}

export async function generateCountLinesAction(id: string) {
  return runAction(async () => stockCountService.generateLines(id));
}

// countedQty ফাঁকা ("") মানে এখনো গোনা হয়নি
export async function saveCountsAction(id: string, lines: { lineId: string; countedQty: string }[]) {
  return runAction(async () => {
    const parsed = lines.map((l) => {
      const t = l.countedQty.trim();
      if (t === "") return { lineId: l.lineId, countedQty: null };
      const n = Number(t);
      if (!Number.isFinite(n)) throw new Error("Counted quantity must be a number");
      return { lineId: l.lineId, countedQty: n };
    });
    return stockCountService.saveCounts(id, parsed);
  });
}

export async function postStockCountAction(id: string) {
  return runAction(async () => stockCountService.post(id));
}

export async function cancelStockCountAction(id: string, reason: string) {
  return runAction(async () => {
    await stockCountService.cancel(id, reason);
    return { id };
  });
}
