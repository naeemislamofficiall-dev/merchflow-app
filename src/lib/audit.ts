import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";

type AuditInput = {
  user: SessionUser;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entity: string; // যেমন "Building"
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

// যেকোনো ডেটাকে (তারিখ সহ) Json-এ রূপান্তর করে
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// অনুরোধের IP ও ব্রাউজারের তথ্য (স্ক্রিপ্ট থেকে চালালে ফাঁকা থাকে)
async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : (h.get("x-real-ip") ?? undefined);
    return { ip, userAgent: h.get("user-agent") ?? undefined };
  } catch {
    return {};
  }
}

export async function writeAudit(input: AuditInput) {
  const meta = await requestMeta();
  await prisma.auditLog.create({
    data: {
      actorId: input.user.id,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: toJson(input.before),
      after: toJson(input.after),
      reason: input.reason,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
}

// ---------- লগইনের ভুল চেষ্টা (সেকশন ৫৪) ----------

const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
const WINDOW_MINUTES = 15;

export async function recordLoginFailure(email: string, userId?: string) {
  const meta = await requestMeta();
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "LOGIN_FAILED",
      entity: "LoginAttempt",
      entityId: email.toLowerCase(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
}

export async function isLoginLocked(email: string): Promise<boolean> {
  const meta = await requestMeta();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [byEmail, byIp] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: "LOGIN_FAILED",
        entity: "LoginAttempt",
        entityId: email.toLowerCase(),
        createdAt: { gte: since },
      },
    }),
    meta.ip
      ? prisma.auditLog.count({
          where: { action: "LOGIN_FAILED", ip: meta.ip, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);
  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}