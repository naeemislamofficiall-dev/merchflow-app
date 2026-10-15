// সেকশন ২৯–৩২-এর হিসাব। এখানে ডাটাবেস নেই, তাই আলাদা করে পরীক্ষা করা যায়।

const round1 = (n: number) => Math.round(n * 10) / 10;

// Efficiency % = output ÷ target (স্পেক: 420 ÷ 450 = 93%)। target ০ হলে null
export function hourEfficiency(target: number, output: number): number | null {
  if (target <= 0) return null;
  return round1((output / target) * 100);
}

export type HourRow = {
  target: number;
  output: number;
  reject: number;
  rework: number;
  downtimeMinutes: number;
};

export function summarizeHours(rows: HourRow[]) {
  const t = { target: 0, output: 0, reject: 0, rework: 0, downtimeMinutes: 0 };
  for (const r of rows) {
    t.target += r.target;
    t.output += r.output;
    t.reject += r.reject;
    t.rework += r.rework;
    t.downtimeMinutes += r.downtimeMinutes;
  }
  const made = t.output + t.reject;
  return {
    ...t,
    efficiencyPct: hourEfficiency(t.target, t.output),
    rejectPct: made > 0 ? round1((t.reject / made) * 100) : null,
  };
}

// ---------- Finishing ফানেল (সেকশন ৩২) ----------
export type FunnelTotals = {
  input: number;
  threadCut: number;
  ironed: number;
  folded: number;
  metalChecked: number;
  qcPassed: number;
  rework: number;
  output: number;
};

export function emptyFunnel(): FunnelTotals {
  return { input: 0, threadCut: 0, ironed: 0, folded: 0, metalChecked: 0, qcPassed: 0, rework: 0, output: 0 };
}

export function sumFunnel(list: FunnelTotals[]): FunnelTotals {
  const t = emptyFunnel();
  for (const x of list) {
    (Object.keys(t) as (keyof FunnelTotals)[]).forEach((k) => {
      t[k] += x[k];
    });
  }
  return t;
}

const FUNNEL: { key: keyof FunnelTotals; label: string; from: keyof FunnelTotals | "sewing" }[] = [
  { key: "input", label: "Finishing input", from: "sewing" },
  { key: "threadCut", label: "Thread cutting", from: "input" },
  { key: "ironed", label: "Ironing", from: "threadCut" },
  { key: "folded", label: "Folding", from: "ironed" },
  { key: "metalChecked", label: "Metal detection", from: "folded" },
  { key: "qcPassed", label: "Finishing QC passed", from: "metalChecked" },
  { key: "output", label: "Finishing output", from: "qcPassed" },
  { key: "rework", label: "Rework", from: "input" },
];

// কোনো ধাপ আগের ধাপের বেশি হলে বার্তার তালিকা ফেরত দেয় (ফাঁকা = ঠিক আছে)
export function funnelErrors(t: FunnelTotals, sewingOutput: number): string[] {
  const errors: string[] = [];
  for (const s of FUNNEL) {
    const limit = s.from === "sewing" ? sewingOutput : t[s.from];
    const fromLabel = s.from === "sewing" ? "sewing output" : FUNNEL.find((x) => x.key === s.from)!.label;
    if (t[s.key] > limit) {
      errors.push(`${s.label} (${t[s.key]}) cannot be more than ${fromLabel} (${limit})`);
    }
  }
  return errors;
}

// ---------- Subcontract (সেকশন ৩১) ----------
export function subcontractBalance(x: { sent: number; received: number; damage: number; reject: number }) {
  return x.sent - x.received - x.damage - x.reject;
}

// ---------- WIP (সেকশন ৩০) ----------
export function wipBalances(x: {
  orderQty: number;
  cut: number;
  sewn: number;
  finished: number;
  packed: number;
  shipped: number;
}) {
  return {
    toCut: x.orderQty - x.cut,
    inSewing: x.cut - x.sewn,
    inFinishing: x.sewn - x.finished,
    toPack: x.finished - x.packed,
    toShip: x.packed - x.shipped,
  };
}