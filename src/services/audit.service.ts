import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { BaseService } from "./base.service";

export const AUDIT_PAGE_SIZE = 50;

export type AuditFilter = { entity?: string; action?: string; actor?: string; page?: number };

class AuditService extends BaseService {
  async list(filter: AuditFilter = {}) {
    const user = await this.guard("audit.view");
    const isAdmin = user.permissions.includes("*");
    const page = Math.max(1, filter.page ?? 1);

    // নিজের company-র ইউজারদের কাজ। লগইন ব্যর্থতার মতো actor-হীন লগ শুধু admin দেখে।
    const scope: Prisma.AuditLogWhereInput = isAdmin
      ? { OR: [{ actor: { companyId: user.companyId } }, { actorId: null }] }
      : { actor: { companyId: user.companyId } };

    const where: Prisma.AuditLogWhereInput = {
      AND: [
        scope,
        ...(filter.entity ? [{ entity: { contains: filter.entity, mode: "insensitive" as const } }] : []),
        ...(filter.action ? [{ action: filter.action }] : []),
        ...(filter.actor ? [{ actor: { email: { contains: filter.actor, mode: "insensitive" as const } } }] : []),
      ],
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
        include: { actor: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { rows, total, page, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
  }
}

export const auditService = new AuditService();
