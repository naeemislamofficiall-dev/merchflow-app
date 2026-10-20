"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-result";
import { BusinessRuleError } from "@/lib/business-rules";
import { requirePermission } from "@/lib/permissions";
import { saveRate } from "@/services/currency.service";

export async function saveRateAction(values: {
  fromCode: string;
  toCode: string;
  rate: string;
  rateDate: string;
}) {
  return runAction(async () => {
    const user = await requirePermission("costing.edit");
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(values.rateDate);
    if (!m) throw new BusinessRuleError("Pick a valid date");
    const row = await saveRate(
      {
        fromCode: values.fromCode,
        toCode: values.toCode,
        rate: values.rate.trim(),
        rateDate: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
      },
      user
    );
    revalidatePath("/currency");
    return { id: row.id };
  });
}