// DHU = Defects per Hundred Units = (total defect) / (inspected pcs) * 100
export function dhu(defects: number, inspected: number): number {
  if (inspected <= 0) return 0;
  return (defects / inspected) * 100;
}

export type ParetoRow = { id: string; qty: number; pct: number; cumPct: number };

// Boro theke chhoto, cumulative % shoho (80/20 dekhar jonno)
export function pareto(items: { id: string; qty: number }[]): ParetoRow[] {
  const sorted = items.filter((i) => i.qty > 0).sort((a, b) => b.qty - a.qty);
  const total = sorted.reduce((s, i) => s + i.qty, 0);
  let run = 0;
  return sorted.map((i) => {
    run += i.qty;
    return { id: i.id, qty: i.qty, pct: (i.qty / total) * 100, cumPct: (run / total) * 100 };
  });
}
