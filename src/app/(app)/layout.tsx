import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthError, can, requireUser } from "@/lib/permissions";
import { listSwitchOptions } from "@/services/context.service";
import { notificationService } from "@/services/notification.service";
import { AppShell } from "@/components/layout/app-shell";
import { NAV, type NavGroupData } from "@/components/layout/nav-config";
import { isTextileEnabled } from "@/lib/textile-flag";
import { getAvatarUrl } from "@/lib/avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Only "not logged in" (AuthError) goes to /login. Any other error is shown, not hidden.
  const user = await requireUser().catch((e) => {
    if (e instanceof AuthError) return null;
    throw e;
  });
  if (!user) redirect("/login");

  const [company, companies, unreadCount, recent, me, role, avatar] = await Promise.all([
    prisma.company.findUnique({
      where: { id: user.companyId },
      select: { tradeName: true, legalName: true },
    }),
    listSwitchOptions(user.id),
    notificationService.unreadCount(),
    notificationService.list(false, 8),
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
    prisma.role.findUnique({ where: { id: user.roleId }, select: { name: true } }),
    getAvatarUrl(user.id),
  ]);
  const textileEnabled = await isTextileEnabled(user.id);
  // যে permission নেই, সেই মেনু দেখানো হয় না
    const groups: NavGroupData[] = NAV.filter((g) => g.feature !== "textile" || textileEnabled).map((g) => ({
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
      userName={me?.name ?? user.email}
      userRole={role?.name ?? ""}
      avatarUrl={avatar}
      unreadCount={unreadCount}
      notifications={recent.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        href: n.href ?? null,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}