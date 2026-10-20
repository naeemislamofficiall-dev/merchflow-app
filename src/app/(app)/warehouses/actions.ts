"use server";

import { dropEmpty, runAction } from "@/lib/action-result";
import { warehouseService } from "@/services/warehouse.service";

export async function createWarehouseAction(values: {
  factoryId: string;
  code: string;
  name: string;
  type: string;
}) {
  return runAction(async () => {
    const row = await warehouseService.createWarehouse(dropEmpty(values));
    return { id: row.id };
  });
}

export async function createBinAction(values: { warehouseId: string; code: string; description: string }) {
  return runAction(async () => {
    const row = await warehouseService.createBin(dropEmpty(values));
    return { id: row.id };
  });
}