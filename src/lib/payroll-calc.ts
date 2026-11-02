// SOHOJ payroll: absent/unpaid-leave deduction + overtime. Eta full statutory payroll NOY
// (tax, PF, bonus, festival bonus nai). Spec: "no full payroll engine".
export const OT_DIVISOR = 208; // Bangladesh Labour Act: ghontar basic = basic / 208
export const OT_MULTIPLIER = 2; // overtime = 2 x ghontar basic

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcPayroll(i: {
  basic: number;
  daysInMonth: number;
  absentDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
}) {
  const perDay = i.daysInMonth > 0 ? i.basic / i.daysInMonth : 0;
  const deduction = r2(perDay * (i.absentDays + i.unpaidLeaveDays));
  const overtimePay = r2((i.basic / OT_DIVISOR) * OT_MULTIPLIER * i.overtimeHours);
  const net = r2(Math.max(0, i.basic - deduction) + overtimePay);
  return { deduction, overtimePay, net };
}

const DAY = 86_400_000;
// [from,to] (duto-i inclusive) ar [monthStart, monthEnd] (inclusive) er overlap koyta din
export function overlapDays(from: Date, to: Date, monthStart: Date, monthEnd: Date): number {
  const s = Math.max(from.getTime(), monthStart.getTime());
  const e = Math.min(to.getTime(), monthEnd.getTime());
  return e < s ? 0 : Math.round((e - s) / DAY) + 1;
}
