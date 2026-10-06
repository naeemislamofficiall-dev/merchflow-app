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

export async function writeAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.user.id,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: toJson(input.before),
      after: toJson(input.after),
      reason: input.reason,
    },
  });
}