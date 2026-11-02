// Approval delegation / escalation hisab. DB nei, tai test kora jay.
export const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// Delegation date range-er moddhe (duto prantoi dhora hoy) ar active
export function delegationCovers(d: { startDate: Date; endDate: Date; isActive: boolean }, today: Date): boolean {
  if (!d.isActive) return false;
  const t = utcDay(today).getTime();
  return t >= utcDay(d.startDate).getTime() && t <= utcDay(d.endDate).getTime();
}

export function daysPending(since: Date, now: Date): number {
  return Math.floor((utcDay(now).getTime() - utcDay(since).getTime()) / 86_400_000);
}

// Pending > N din hole escalate (ekbar-i per step). afterDays null/0 hole off
export function shouldEscalate(since: Date, now: Date, afterDays: number | null | undefined, already: boolean): boolean {
  if (!afterDays || afterDays <= 0 || already) return false;
  return daysPending(since, now) > afterDays;
}