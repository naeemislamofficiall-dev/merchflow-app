import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can, requireUser } from "@/lib/permissions";
import { listSwitchOptions } from "@/services/context.service";
import { AppShell } from "@/components/layout/app-shell";
import { NAV, type NavGroupData } from "@/components/layout/nav-config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  const [company, companies] = await Promise.all([
    prisma.company.findUnique({
      where: { id: user.companyId },
      select: { tradeName: true, legalName: true },
    }),
    listSwitchOptions(user.id),
  ]);

  // যে permission নেই, সেই মেনু দেখানো হয় না
  const groups: NavGroupData[] = NAV.map((g) => ({
    label: g.label,
    items: g.items.filter((i) => !i.permission || can(user, i.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <AppShell
      groups={groups}
      companyName={company?.tradeName ?? company?.legalName ?? "-"}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      activeCompanyId={user.companyId}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  );
}