export const EXPIRING_SOON_DAYS = 30;
export type CertStatus = "EXPIRED" | "EXPIRING" | "VALID";

export function certStatus(expiry: Date, now: Date = new Date()): { status: CertStatus; daysLeft: number } {
  const DAY = 86_400_000;
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const e = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  const daysLeft = Math.round((e - t) / DAY);
  return { daysLeft, status: daysLeft < 0 ? "EXPIRED" : daysLeft <= EXPIRING_SOON_DAYS ? "EXPIRING" : "VALID" };
}
