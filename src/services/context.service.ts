import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";

const C_COMPANY = "mf_company";
const C_FACTORY = "mf_factory";

// এখন user কোন company/factory-তে কাজ করছে (cookie যাচাই করে, scope-এর বাইরে হলে বাদ)
export async function getActiveContext(userId: string) {
  const scope = await resolveScope(userId);
  const jar = await cookies();

  let companyId = jar.get(C_COMPANY)?.value;
  let factoryId = jar.get(C_FACTORY)?.value;

  if (!companyId || !scope.companyIds.includes(companyId)) {
    companyId = scope.companyIds[0];
  }
  if (factoryId && !scope.factoryIds.includes(factoryId)) {
    factoryId = undefined;
  }

  const company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { currency: true },
      })
    : null;

  return { scope, companyId, factoryId, baseCurrency: company?.currency ?? "BDT" };
}

// Server Action থেকে ডাকতে হবে
export async function setActiveContext(
  userId: string,
  input: { companyId: string; factoryId?: string }
) {
  const scope = await resolveScope(userId);
  if (!scope.companyIds.includes(input.companyId)) throw new Error("FORBIDDEN_SCOPE: company");
  if (input.factoryId && !scope.factoryIds.includes(input.factoryId)) {
    throw new Error("FORBIDDEN_SCOPE: factory");
  }

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  jar.set(C_COMPANY, input.companyId, opts);
  if (input.factoryId) jar.set(C_FACTORY, input.factoryId, opts);
  else jar.delete(C_FACTORY);
}

// ব্যাচ ৫-এর dropdown-এর জন্য তালিকা
export async function listSwitchOptions(userId: string) {
  const scope = await resolveScope(userId);
  const companies = await prisma.company.findMany({
    where: { id: { in: scope.companyIds } },
    select: {
      id: true,
      tradeName: true,
      legalName: true,
      factories: { select: { id: true, name: true } },
    },
  });
  return companies.map((c) => ({
    id: c.id,
    name: c.tradeName ?? c.legalName,
    factories: c.factories.filter((f) => scope.factoryIds.includes(f.id)),
  }));
}