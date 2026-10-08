import type { Locale } from "@/lib/i18n";

export function formatMoney(
  value: number | string | { toString(): string },
  currency: string,
  locale: Locale = "en"
) {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(String(value)));
}

export function formatDate(date: Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}