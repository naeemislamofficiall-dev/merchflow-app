import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { resolveScope } from "@/lib/scope";

// Factory.factoryType is free text, so match case-insensitively.
export const TEXTILE_FACTORY_TYPES = ["TEXTILE", "COMPOSITE", "KNIT"] as const;

export function isTextileType(factoryType: string | null | undefined): boolean {
  if (!factoryType) return false;
  return (TEXTILE_FACTORY_TYPES as readonly string[]).includes(factoryType.trim().toUpperCase());
}

// Nav / list pages: is at least one factory in this user's scope a textile factory?
export async function isTextileEnabled(userId: string): Promise<boolean> {
  const scope = await resolveScope(userId);
  if (scope.factoryIds.length === 0) return false;
  const rows = await prisma.factory.findMany({
    where: { id: { in: scope.factoryIds }, status: "ACTIVE" },
    select: { factoryType: true },
  });
  return rows.some((f) => isTextileType(f.factoryType));
}

// Create / update: this specific factory must be a textile factory (blocks direct URL access).
export async function assertTextileFactory(factoryId: string) {
  const f = await prisma.factory.findUnique({ where: { id: factoryId }, select: { factoryType: true } });
  if (!f || !isTextileType(f.factoryType)) {
    throw new BusinessRuleError("Textile processing is not enabled for this factory");
  }
}