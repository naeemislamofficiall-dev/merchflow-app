// Rule-based order risk. Kono LLM na: prottek reason ashol data theke, tai jachai kora jay.
export type RiskInput = {
  daysToShip: number | null; // order.shipDate - today
  overdueTna: number; // overdue T&A milestone
  maxTnaLateDays: number;
  latePoLines: number; // ei order-er open PO jar follow-up delay > 0
  maxPoDelayDays: number;
  producedPct: number | null; // completedQty / quantity * 100 (sob production order mile)
  hasProduction: boolean;
  finalInspectionFailed: boolean;
};

export type RiskResult = { score: number; level: "HIGH" | "MEDIUM" | "LOW"; reasons: string[] };

export function scoreOrder(i: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (i.overdueTna > 0) {
    score += Math.min(40, 10 + i.overdueTna * 5 + Math.min(i.maxTnaLateDays, 14));
    reasons.push(`${i.overdueTna} T&A milestone(s) overdue (worst ${i.maxTnaLateDays} days late)`);
  }
  if (i.latePoLines > 0) {
    score += Math.min(30, 10 + i.latePoLines * 3 + Math.min(i.maxPoDelayDays, 10));
    reasons.push(`${i.latePoLines} PO line(s) delayed by supplier (worst ${i.maxPoDelayDays} days)`);
  }
  if (i.daysToShip !== null && i.daysToShip >= 0 && i.daysToShip <= 14) {
    if (!i.hasProduction) {
      score += 30;
      reasons.push(`Ships in ${i.daysToShip} days but no production order exists`);
    } else if (i.producedPct !== null && i.producedPct < 80) {
      score += 30;
      reasons.push(`Ships in ${i.daysToShip} days but only ${i.producedPct.toFixed(0)}% produced`);
    }
  }
  if (i.daysToShip !== null && i.daysToShip < 0) {
    score += 20;
    reasons.push(`Ship date passed ${Math.abs(i.daysToShip)} days ago and order is still open`);
  }
  if (i.finalInspectionFailed) {
    score += 25;
    reasons.push("Latest final/pre-shipment AQL inspection FAILED");
  }

  score = Math.min(100, score);
  return { score, level: score >= 50 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW", reasons };
}
