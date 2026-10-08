import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const COOKIE = "mf_locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// শুধু Server Action বা Route Handler থেকে ডাকা যাবে
export async function setLocale(locale: Locale, userId?: string) {
  if (!isLocale(locale)) throw new Error("Invalid locale");
  (await cookies()).set(COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { locale } });
  }
}