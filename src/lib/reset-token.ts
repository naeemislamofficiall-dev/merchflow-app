import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// পাসওয়ার্ড রিসেট লিংকের টোকেন। আলাদা টেবিল লাগে না:
// টোকেনের সই (signature)-তে ইউজারের বর্তমান passwordHash ধরা থাকে,
// তাই পাসওয়ার্ড বদলালেই পুরনো লিংক নিজে থেকে অচল হয়ে যায় (একবারই চলে)।
const TTL_MS = 60 * 60 * 1000; // ১ ঘণ্টা

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(uid: string, exp: number, passwordHash: string) {
  return createHmac("sha256", secret()).update(`${uid}.${exp}.${passwordHash}`).digest("base64url");
}

export function createResetToken(user: { id: string; passwordHash: string }) {
  const exp = Date.now() + TTL_MS;
  return `${user.id}.${exp}.${sign(user.id, exp, user.passwordHash)}`;
}

// টোকেন ঠিক ও মেয়াদ থাকলে ইউজার ফেরত দেয়, না হলে null
export async function readResetToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!uid || !Number.isFinite(exp) || exp < Date.now()) return null;

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.status !== "ACTIVE") return null;

  const expected = Buffer.from(sign(user.id, exp, user.passwordHash));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return user;
}
