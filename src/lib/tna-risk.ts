// Spec section 11: planned date kache, predecessor complete na -> AT RISK;
// date pare gele -> OVERDUE; delay shipment-ke chhuye gele -> SHIPMENT RISK.
export const AT_RISK_WINDOW_DAYS = 3; // date-er koto din age theke predecessor check hobe
export const SHIPMENT_WINDOW_DAYS = 21; // overdue + ship date eto dinr moddhe hole shipment risk

export type RiskLevel = "OK" | "AT_RISK" | "OVERDUE" | "SHIPMENT_RISK";

type TaskLike = {
  status: string;
  plannedDate: Date;
  revisedDate: Date | null;
  dependsOnStatus?: string | null; // predecessor-er status, na thakle null
};

const DAY = 86_400_000;
const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const effectiveDate = (t: Pick<TaskLike, "plannedDate" | "revisedDate">) => t.revisedDate ?? t.plannedDate;

export function classifyTask(t: TaskLike, shipDate: Date | null, now: Date = new Date()): RiskLevel {
  if (t.status === "COMPLETED" || t.status === "WAIVED") return "OK";
  const today = startOfUtcDay(now).getTime();
  const due = startOfUtcDay(effectiveDate(t)).getTime();
  const daysToDue = Math.round((due - today) / DAY);

  if (daysToDue < 0) {
    if (shipDate) {
      const daysToShip = Math.round((startOfUtcDay(shipDate).getTime() - today) / DAY);
      if (daysToShip <= SHIPMENT_WINDOW_DAYS) return "SHIPMENT_RISK";
    }
    return "OVERDUE";
  }
  const predecessorOpen = !!t.dependsOnStatus && t.dependsOnStatus !== "COMPLETED" && t.dependsOnStatus !== "WAIVED";
  if (daysToDue <= AT_RISK_WINDOW_DAYS && predecessorOpen) return "AT_RISK";
  return "OK";
}

export const delayDays = (t: TaskLike, now: Date = new Date()) =>
  Math.max(0, Math.round((startOfUtcDay(now).getTime() - startOfUtcDay(effectiveDate(t)).getTime()) / DAY));
