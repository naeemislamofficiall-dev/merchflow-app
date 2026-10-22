import { round2 } from "@/lib/finance-calc";

// বাজেট বনাম আসল খরচ (ডাটাবেস ছাড়া হিসাব)
export function budgetUsage(budget: number, actual: number) {
  return {
    budget: round2(budget),
    actual: round2(actual),
    remaining: round2(budget - actual),
    usedPct: budget > 0 ? round2((actual / budget) * 100) : null,
    over: actual > budget,
  };
}

// মাসের প্রথম দিন (UTC) আর পরের মাসের প্রথম দিন
export function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}
