import { round2 } from "@/lib/finance-calc";

// মাসে কত দিন
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ইউজারের দেওয়া তারিখ ("2026-10-21") থেকে UTC মধ্যরাতের Date
export function dateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function dayCount(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

// বেতনের হিসাব (ডাটাবেস ছাড়া, তাই সহজে টেস্ট করা যায়)
// দৈনিক হার = মূল বেতন ÷ মাসের দিন। অনুপস্থিত দিনের জন্য সেই হারে কাটা যায়।
export function computePay(i: {
  basic: number;
  allowance: number;
  overtimeRate: number;
  monthDays: number;
  absentDays: number;
  overtimeHours: number;
}) {
  const daily = i.monthDays > 0 ? i.basic / i.monthDays : 0;
  const deduction = round2(daily * i.absentDays);
  const overtimePay = round2(i.overtimeHours * i.overtimeRate);
  const gross = round2(i.basic + i.allowance + overtimePay);
  const netPay = Math.max(0, round2(gross - deduction));
  return { deduction, overtimePay, gross, netPay };
}
