"use server";

import { runAction } from "@/lib/action-result";
import { BusinessRuleError } from "@/lib/business-rules";
import { scanService } from "@/services/scan.service";

export async function resolveScanAction(raw: string) {
  return runAction(() => scanService.resolve(raw));
}

export type LabelData = { title: string; lines: string[]; qrDataUrl: string };

// ref: ROLL আর BUNDLE-এর জন্য নম্বর, LOT-এর জন্য lot id
export async function labelAction(type: string, ref: string) {
  return runAction(async (): Promise<LabelData> => {
    if (type === "ROLL") {
      const l = await scanService.rollLabel(ref);
      return {
        title: l.rollNo,
        qrDataUrl: l.qrDataUrl,
        lines: [
          l.material,
          `Lot ${l.lotNo}`,
          [l.color, l.shade].filter(Boolean).join(" / "),
          [l.length !== null ? `${l.length} m` : "", l.weightKg !== null ? `${l.weightKg} kg` : ""]
            .filter(Boolean)
            .join(" · "),
        ].filter(Boolean),
      };
    }
    if (type === "BUNDLE") {
      const l = await scanService.bundleLabel(ref);
      return {
        title: l.bundleNo,
        qrDataUrl: l.qrDataUrl,
        lines: [`Style ${l.style}`, `${l.color} / ${l.size}`, `Qty ${l.quantity}`, `Cut ${l.cutNumber}`],
      };
    }
    if (type === "LOT") {
      const l = await scanService.lotLabel(ref);
      return {
        title: l.lotNo,
        qrDataUrl: l.qrDataUrl,
        lines: [l.material, [l.color, l.shade].filter(Boolean).join(" / ")].filter(Boolean),
      };
    }
    throw new BusinessRuleError("No label for this type");
  });
}