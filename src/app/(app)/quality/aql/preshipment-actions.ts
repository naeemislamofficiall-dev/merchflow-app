"use server";

import { runAction } from "@/lib/action-result";
import { aqlService } from "@/services/aql.service";

type ReportValues = {
  cartonsTotal: string;
  cartonsChecked: string;
  packingOk: string;
  labelingOk: string;
  measurementOk: string;
  workmanshipOk: string;
  summary: string;
  inspectedByName: string;
};

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
const flag = (v: string) => (v === "" ? undefined : v === "yes");

export async function savePreshipmentReportAction(id: string, v: ReportValues) {
  return runAction(async () => {
    const row = await aqlService.savePreshipmentReport(id, {
      cartonsTotal: num(v.cartonsTotal),
      cartonsChecked: num(v.cartonsChecked),
      packingOk: flag(v.packingOk),
      labelingOk: flag(v.labelingOk),
      measurementOk: flag(v.measurementOk),
      workmanshipOk: flag(v.workmanshipOk),
      summary: v.summary,
      inspectedByName: v.inspectedByName.trim() || undefined,
    });
    return { id: row.id };
  });
}