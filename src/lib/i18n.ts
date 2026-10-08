import { en } from "@/messages/en";
import { bn } from "@/messages/bn";

export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Record<string, string>> = { en, bn };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// অনুবাদ না থাকলে ইংরেজি, তাও না থাকলে key নিজেই দেখায়
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  let text = dictionaries[locale][key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}