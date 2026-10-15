// IE ও PPC-র হিসাব (সেকশন ২৫, ২৭): SMV যোগফল, লাইন ব্যালেন্সিং, কর্মদিবস

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export type OperationInput = {
  id: string;
  seq: number;
  name: string;
  machineType: string | null;
  smv: number; // এক পিস বানাতে এই কাজে কত মিনিট লাগে
  operators: number; // এই কাজে কতজন অপারেটর দেওয়া আছে
};

export function totalSmv(ops: { smv: number }[]): number {
  return round3(ops.reduce((s, o) => s + o.smv, 0));
}

// লাইন ব্যালেন্সিং:
// - প্রতিটা কাজের ক্ষমতা = অপারেটর × ৬০ × দক্ষতা% ÷ SMV (ঘণ্টায় কত পিস)
// - লক্ষ্য (targetPerHour) ধরতে না পারলে সেটা bottleneck
// - সবচেয়ে ধীর কাজটা (slowest) পুরো লাইনের আউটপুট ঠিক করে
export function lineBalance(
  ops: OperationInput[],
  p: { targetPerHour: number; efficiencyPct?: number }
) {
  const eff = (p.efficiencyPct ?? 100) / 100;
  const rows = ops.map((o) => {
    const capacityPerHour = (o.operators * 60 * eff) / o.smv;
    return {
      id: o.id,
      seq: o.seq,
      name: o.name,
      machineType: o.machineType,
      smv: o.smv,
      operators: o.operators,
      workloadMinPerHour: round2(o.smv * p.targetPerHour),
      neededOperators: round2((o.smv * p.targetPerHour) / (60 * eff)),
      capacityPerHour: round2(capacityPerHour),
      utilizationPct: round2((p.targetPerHour / capacityPerHour) * 100),
      bottleneck: capacityPerHour < p.targetPerHour,
      slowest: false,
    };
  });

  const minCap = Math.min(...rows.map((r) => r.capacityPerHour));
  for (const r of rows) r.slowest = r.capacityPerHour === minCap;

  const sumSmv = totalSmv(ops);
  const sumOperators = ops.reduce((s, o) => s + o.operators, 0);
  const slowestStation = Math.max(...ops.map((o) => o.smv / o.operators)); // সবচেয়ে বেশি সময়ের ধাপ
  const balancePct = round2((sumSmv / (slowestStation * sumOperators)) * 100);

  return {
    totalSmv: sumSmv,
    totalOperators: round2(sumOperators),
    neededOperatorsTotal: round2(rows.reduce((s, r) => s + r.neededOperators, 0)),
    lineOutputPerHour: round2(minCap), // লাইন ঘণ্টায় আসলে কত পিস দিতে পারবে
    balanceEfficiencyPct: balancePct,
    operations: rows,
  };
}

// শুক্রবার (৫) সাধারণত বন্ধ। weekend: 0 = রবি ... 6 = শনি
export function workingDaysBetween(from: Date, to: Date, weekend: number[]): number {
  let n = 0;
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (d <= end) {
    if (!weekend.includes(d.getDay())) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

// দুই তারিখ-সীমার মিল (নেই হলে null)
export function overlap(aFrom: Date, aTo: Date, bFrom: Date, bTo: Date): { from: Date; to: Date } | null {
  const from = aFrom > bFrom ? aFrom : bFrom;
  const to = aTo < bTo ? aTo : bTo;
  return from <= to ? { from, to } : null;
}