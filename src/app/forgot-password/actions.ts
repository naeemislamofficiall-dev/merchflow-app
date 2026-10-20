"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().trim().toLowerCase().email();
const MAX_PER_HOUR = 5;

// কে আছে কে নেই — এই তথ্য ফাঁস করা যাবে না, তাই সবসময় একই উত্তর।
// অনুরোধটা audit log-এ লেখা হয়, admin সেখান থেকে দেখে রিসেট লিংক পাঠায়।
export async function requestPasswordResetAction(email: string): Promise<{ ok: true }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: true };
  const address = parsed.data;

  const since = new Date(Date.now() - 60 * 60_000);
  const recent = await prisma.auditLog.count({
    where: { action: "PASSWORD_RESET_REQUESTED", entityId: address, createdAt: { gte: since } },
  });
  if (recent >= MAX_PER_HOUR) return { ok: true };

  const user = await prisma.user.findUnique({ where: { email: address }, select: { id: true } });
  let ip: string | undefined;
  let userAgent: string | undefined;
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    ip = fwd ? fwd.split(",")[0].trim() : (h.get("x-real-ip") ?? undefined);
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    // স্ক্রিপ্ট থেকে চালালে header নেই
  }

  await prisma.auditLog.create({
    data: {
      actorId: user?.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "PasswordReset",
      entityId: address,
      ip,
      userAgent,
    },
  });
  return { ok: true };
}
