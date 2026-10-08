import { prisma } from "@/lib/prisma";

export type ScopeLevel = "OWN" | "DEPARTMENT" | "FACTORY" | "COMPANY" | "GROUP";

export type DataScope = {
  userId: string;
  level: ScopeLevel;
  companyIds: string[];
  factoryIds: string[];
};

// user কোন কোন company ও factory-র ডাটা দেখতে পারবে তা বের করে
export async function resolveScope(userId: string): Promise<DataScope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      scope: true,
      companyId: true,
      factoryId: true,
      company: { select: { groupId: true } },
      extraFactories: { select: { factoryId: true } },
    },
  });
  if (!user) throw new Error("User not found");

  let companyIds: string[] = [];
  let factoryIds: string[] = [];

  // GROUP: নিজের Group-এর সব Company (Group না থাকলে শুধু নিজের Company)
  if (user.scope === "GROUP" && user.company?.groupId) {
    const list = await prisma.company.findMany({
      where: { groupId: user.company.groupId },
      select: { id: true },
    });
    companyIds = list.map((c) => c.id);
  } else if (user.scope === "GROUP" || user.scope === "COMPANY") {
    if (user.companyId) companyIds = [user.companyId];
  }

  if (companyIds.length > 0) {
    // GROUP / COMPANY: ওই company-গুলোর সব factory
    const list = await prisma.factory.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true },
    });
    factoryIds = list.map((f) => f.id);
  } else {
    // FACTORY / DEPARTMENT / OWN: নিজের factory + বাড়তি অনুমতি পাওয়া factory
    const ids = new Set<string>();
    if (user.factoryId) ids.add(user.factoryId);
    for (const x of user.extraFactories) ids.add(x.factoryId);
    factoryIds = [...ids];

    if (factoryIds.length > 0) {
      const list = await prisma.factory.findMany({
        where: { id: { in: factoryIds } },
        select: { companyId: true },
      });
      companyIds = [...new Set(list.map((f) => f.companyId))];
    }
    if (user.companyId && !companyIds.includes(user.companyId)) {
      companyIds.push(user.companyId);
    }
  }

  return { userId, level: user.scope as ScopeLevel, companyIds, factoryIds };
}

// প্রতিটা list query-তে where-এর ভেতরে ছড়িয়ে দাও: { ...companyWhere(scope) }
export function companyWhere(scope: DataScope) {
  return { companyId: { in: scope.companyIds } };
}

export function factoryWhere(scope: DataScope) {
  return { factoryId: { in: scope.factoryIds } };
}

// অন্য company/factory-র record-এ হাত দিতে চাইলে এরর (IDOR সুরক্ষা)
export function assertCompanyInScope(scope: DataScope, companyId: string) {
  if (!scope.companyIds.includes(companyId)) {
    throw new Error("FORBIDDEN_SCOPE: company");
  }
}

export function assertFactoryInScope(scope: DataScope, factoryId: string) {
  if (!scope.factoryIds.includes(factoryId)) {
    throw new Error("FORBIDDEN_SCOPE: factory");
  }
}